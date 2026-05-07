/**
 * useVoiceFlow — speak/listen/parse loop for personal-info entry.
 *
 * Uses ContinuousRecognizerModule (Kotlin bridge) to keep one SpeechRecognizer
 * alive for the entire session — no mic on/off sounds between fields.
 *
 * Flow per field:
 *   1. speakField()  → pauseProcessing() + Tts.speak()
 *   2. tts-finish    → resumeProcessing() (mic already warm, JS now accepts results)
 *   3. onResult      → handleTranscript() → setFields → advance()
 *   4. advance()     → speakField(next)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Tts from 'react-native-tts';
import { Platform } from 'react-native';

import type { AppState, Field, LocaleCode } from '../types';
import { parseFieldValue } from '../utils/parseFieldValue';
import { detectCommand } from '../utils/detectCommand';
import { ensureMicPermission } from '../utils/permissions';
import { useContinuousVoice } from './useContinuousVoice';

interface UseVoiceFlowProps {
  fields: Field[];
  setFields: React.Dispatch<React.SetStateAction<Field[]>>;
  locale?: LocaleCode;
  onComplete?: () => void;
  /** When false, TTS questions are skipped — mic opens instantly between fields. */
  audioPrompts?: boolean;
}

export interface VoiceFlowApi {
  appState: AppState;
  running: boolean;
  currentIndex: number;
  errorMsg: string;
  partialTranscript: string;
  lastTranscript: string;

  start: () => Promise<void>;
  stop: () => Promise<void>;
  repeat: () => void;
  skip: () => void;
  back: () => void;
}

export function useVoiceFlow({
  fields,
  setFields,
  locale = 'en-US',
  onComplete,
  audioPrompts = true,
}: UseVoiceFlowProps): VoiceFlowApi {
  const [appState, setAppState] = useState<AppState>('idle');
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');

  const runningRef = useRef(running);
  const indexRef = useRef(currentIndex);
  const localeRef = useRef(locale);
  const fieldsRef = useRef(fields);

  // True once the current field's result has been accepted, prevents double-fires.
  const handledRef = useRef(false);
  const partialRef = useRef('');
  const errorRetryRef = useRef(0);
  const MAX_ERROR_RETRIES = 8;
  /** What TTS last spoke — used to filter acoustic echo from ASR results. */
  const lastSpokenRef = useRef('');

  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduleTimer = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimersRef.current = pendingTimersRef.current.filter(t => t !== id);
      fn();
    }, ms);
    pendingTimersRef.current.push(id);
    return id;
  };
  const clearPendingTimers = () => {
    pendingTimersRef.current.forEach(clearTimeout);
    pendingTimersRef.current = [];
  };

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { localeRef.current = locale; }, [locale]);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  // ------------------------------------------------------------------
  // Continuous voice bridge
  // ------------------------------------------------------------------
  const cv = useContinuousVoice({
    onReady: () => {
      if (!runningRef.current) return;
      setAppState('listening');
      setPartialTranscript('');
      partialRef.current = '';
      handledRef.current = false;
    },
    onPartial: (text) => {
      if (!runningRef.current) return;
      if (text && !isTtsEcho(text, lastSpokenRef.current)) {
        partialRef.current = text;
        setPartialTranscript(text);
      }
    },
    onCandidates: (candidates) => {
      if (!runningRef.current) return;
      if (handledRef.current) return;
      if (!candidates.length) return;

      // Filter out any candidates that are echo of what TTS just said.
      const filtered = candidates.filter(c => !isTtsEcho(c, lastSpokenRef.current));
      if (!filtered.length) return; // all were echo — wait for user speech

      const idx = indexRef.current;
      const field = fieldsRef.current[idx];

      let winner = filtered[0];
      if (field && field.kind !== 'text') {
        for (const c of filtered) {
          if (parseFieldValue(c, field.kind) !== null) { winner = c; break; }
        }
      }

      const transcript = winner.trim() || filtered[0].trim();
      if (!transcript) return;

      handledRef.current = true;
      setPartialTranscript('');
      setLastTranscript(transcript);
      handleTranscript(transcript); // eslint-disable-line @typescript-eslint/no-use-before-define
    },
    onSessionReset: () => {
      // Each fresh mic open resets the error budget so fields don't inherit
      // retries from the previous field's failed attempts.
      errorRetryRef.current = 0;
    },
    onError: (code) => {
      if (!runningRef.current) return;
      if (handledRef.current) return;

      // Try rescue from partial even on error.
      const partial = partialRef.current.trim();
      if (partial) {
        handledRef.current = true;
        setLastTranscript(partial);
        setPartialTranscript('');
        handleTranscript(partial); // eslint-disable-line @typescript-eslint/no-use-before-define
        return;
      }

      errorRetryRef.current += 1;
      if (errorRetryRef.current > MAX_ERROR_RETRIES) {
        setErrorMsg(
          `Tried ${MAX_ERROR_RETRIES} times without success. Tap Repeat or Skip.`,
        );
        setAppState('idle');
        return;
      }
      setErrorMsg('');
      scheduleTimer(() => {
        if (!runningRef.current) return;
        handledRef.current = false;
        partialRef.current = '';
        // onReady will set state back to 'listening' when mic reopens.
      }, 150); // was 400ms
    },
  });

  // ------------------------------------------------------------------
  // Core flow helpers
  // ------------------------------------------------------------------

  const handleTranscript = useCallback(
    (text: string) => {
      // Stay in 'listening' state — no 'processing' flash that blocks the mic.
      const cmd = detectCommand(text);

      if (cmd) {
        switch (cmd) {
          case 'skip':
          case 'next':
            advance(); // eslint-disable-line @typescript-eslint/no-use-before-define
            return;
          case 'back':
            goBack(); // eslint-disable-line @typescript-eslint/no-use-before-define
            return;
          case 'repeat':
            speakField(indexRef.current); // eslint-disable-line @typescript-eslint/no-use-before-define
            return;
          case 'cancel':
            // Stay on same field, just listen again.
            handledRef.current = false;
            setAppState('listening');
            return;
          case 'save':
          case 'close':
            setRunning(false);
            setAppState('idle');
            Tts.speak(cmd === 'save' ? 'Saving your details.' : 'Closing voice entry.');
            return;
          case 'yes':
          case 'no':
            return;
        }
      }

      const idx = indexRef.current;
      const field = fieldsRef.current[idx];
      if (!field) return;

      const parsed = parseFieldValue(text, field.kind);
      if (parsed === null) {
        setErrorMsg(
          `Couldn't read "${text}" as ${kindLabel(field.kind)}. Try again, or say "skip".`,
        );
        scheduleTimer(() => {
          if (!runningRef.current) return;
          handledRef.current = false;
          // Native side will restart mic; onReady will set state to 'listening'.
        }, 120); // was 300ms
        return;
      }

      setFields(prev => {
        const cp = [...prev];
        cp[idx] = { ...cp[idx], value: parsed };
        return cp;
      });
      scheduleTimer(() => advance(), 40); // was 80ms — advance sooner after value accepted // eslint-disable-line @typescript-eslint/no-use-before-define
    },
    // advance, goBack, speakField declared below — safe because scheduleTimer wraps calls
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setFields],
  );

  const speakField = useCallback(async (idx: number) => {
    const f = fieldsRef.current[idx];
    if (!f) return;

    clearPendingTimers();
    setErrorMsg('');
    handledRef.current = false;
    partialRef.current = '';
    cv.pauseProcessing();

    if (!audioPrompts) {
      // Silent mode: skip TTS entirely — mic opens after a brief 80ms transition.
      // Field label is shown on screen; operator speaks value immediately.
      setAppState('listening');
      scheduleTimer(() => cv.resumeProcessing(), 30); // was 80ms — open mic faster in Fast mode
      return;
    }

    // Speak the question, then open mic on tts-finish.
    setAppState('speaking');
    lastSpokenRef.current = f.spokenPrompt; // remember so echo filter can discard it
    try { Tts.stop(); } catch {}
    try {
      await Tts.speak(f.spokenPrompt);
    } catch {
      cv.resumeProcessing();
    }
  }, [cv, audioPrompts]);

  const advance = useCallback(() => {
    clearPendingTimers();
    errorRetryRef.current = 0;
    const next = indexRef.current + 1;
    if (next >= fieldsRef.current.length) {
      setRunning(false);
      setAppState('idle');
      cv.stopSession();
      Tts.speak('All done. Tap save to store your details.');
      onComplete?.();
      return;
    }
    setCurrentIndex(next);
    scheduleTimer(() => speakField(next), 50); // was 100ms
  }, [cv, onComplete, speakField]);

  const goBack = useCallback(() => {
    clearPendingTimers();
    const prev = Math.max(0, indexRef.current - 1);
    setCurrentIndex(prev);
    scheduleTimer(() => speakField(prev), 50); // was 100ms
  }, [speakField]);

  // ------------------------------------------------------------------
  // TTS setup + tts-finish → resumeProcessing
  // ------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    Tts.getInitStatus().then(
      () => {
        Tts.setDefaultRate(0.55);   // was 0.42 — faster prompts = less wait
        Tts.setDefaultPitch(1.0);
        Tts.setDefaultLanguage('en-IN').catch(() => Tts.setDefaultLanguage('en-US'));
        // Do NOT enable ducking — it suppresses TTS volume itself on some devices.
      },
      (err: any) => {
        if (err?.code === 'no_engine' && Platform.OS === 'android') {
          Tts.requestInstallEngine();
        }
      },
    );

    const ttsFinishSub = Tts.addEventListener('tts-finish', () => {
      if (!mounted || !runningRef.current) return;
      // resumeProcessing() now handles its own 500ms delay internally (Kotlin side)
      // so we can call it immediately here — the mic won't open until the audio clears.
      cv.resumeProcessing();
    });

    return () => {
      mounted = false;
      clearPendingTimers();
      try { Tts.stop(); } catch {}
      const sub = ttsFinishSub as any;
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  const start = useCallback(async () => {
    clearPendingTimers();
    errorRetryRef.current = 0;
    handledRef.current = false;
    setErrorMsg('');
    setRunning(true);
    setCurrentIndex(0);

    const ok = await ensureMicPermission();
    if (!ok) {
      setErrorMsg('Microphone permission denied.');
      setRunning(false);
      setAppState('idle');
      return;
    }

    // Start the persistent recognizer session ONCE.
    cv.startSession(localeRef.current);

    // Let the recognizer warm up, then ask the first question.
    scheduleTimer(() => speakField(0), 200); // was 400ms — mic warms up faster now
  }, [cv, speakField]);

  const stop = useCallback(async () => {
    setRunning(false);
    clearPendingTimers();
    Tts.stop();
    cv.stopSession();
    setAppState('idle');
  }, [cv]);

  const repeat = useCallback(() => speakField(indexRef.current), [speakField]);
  const skip = useCallback(() => advance(), [advance]);
  const goBackPublic = useCallback(() => goBack(), [goBack]);

  return {
    appState,
    running,
    currentIndex,
    errorMsg,
    partialTranscript,
    lastTranscript,
    start,
    stop,
    repeat,
    skip,
    back: goBackPublic,
  };
}

function kindLabel(k: Field['kind']): string {
  switch (k) {
    case 'number':  return 'a measurement number (e.g. 70, 1.5)';
    case 'percent': return 'a percentage between 0 and 100';
    case 'phone':   return 'a phone number';
    case 'email':   return 'an email address';
    case 'text':    return 'text';
  }
}

/**
 * Returns true when the ASR result is likely an acoustic echo of TTS output.
 * Normalises both strings and checks significant token overlap.
 */
function isTtsEcho(candidate: string, lastSpoken: string): boolean {
  if (!lastSpoken) return false;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const c = norm(candidate);
  const t = norm(lastSpoken);
  if (!c || !t) return false;
  
  // Exact match
  if (c === t) return true;
  
  // If the ASR captured a significant chunk of the TTS prompt, it's an echo.
  // We restrict this to strings longer than 3 characters so we don't accidentally
  // discard valid short inputs (like "1" matching "diff 1").
  if (c.length > 3 && t.includes(c)) return true;
  if (t.length > 3 && c.includes(t)) return true;

  return false;
}
