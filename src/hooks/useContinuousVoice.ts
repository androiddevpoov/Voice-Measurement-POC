/**
 * useContinuousVoice
 *
 * Thin JS wrapper around the ContinuousRecognizerModule Kotlin bridge.
 * The native side keeps ONE SpeechRecognizer alive for the whole session —
 * no destroy/create between fields → no system mic-on / mic-off sounds.
 *
 * Usage:
 *   const cv = useContinuousVoice();
 *   cv.startSession('en-IN');
 *   cv.pauseProcessing();   // before TTS speaks
 *   cv.resumeProcessing();  // after TTS finishes → JS gets onReady again
 *   cv.stopSession();
 */

import { useEffect, useRef, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ContinuousRecognizer: NativeModule } = NativeModules;

// Graceful no-op when running on iOS or in unit tests.
const isSupported = Platform.OS === 'android' && !!NativeModule;

const emitter = isSupported ? new NativeEventEmitter(NativeModule) : null;

export interface ContinuousVoiceCallbacks {
  onReady?: () => void;
  onPartial?: (text: string) => void;
  onCandidates?: (candidates: string[]) => void;
  onError?: (code: string) => void;
  onSessionReset?: () => void;
}

export function useContinuousVoice(callbacks: ContinuousVoiceCallbacks) {
  // Keep callbacks in a ref so event listeners never go stale.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!emitter) return;

    const subs = [
      emitter.addListener('ContinuousRecognizer.onReady', () => {
        cbRef.current.onReady?.();
      }),
      emitter.addListener('ContinuousRecognizer.onPartial', (text: string) => {
        cbRef.current.onPartial?.(text);
      }),
      emitter.addListener('ContinuousRecognizer.onCandidates', (candidates: string[]) => {
        cbRef.current.onCandidates?.(candidates);
      }),
      emitter.addListener('ContinuousRecognizer.onError', (code: string) => {
        cbRef.current.onError?.(code);
      }),
      emitter.addListener('ContinuousRecognizer.onSessionReset', () => {
        cbRef.current.onSessionReset?.();
      }),
    ];

    return () => subs.forEach(s => s.remove());
  }, []);

  const startSession = useCallback((locale = 'en-IN') => {
    NativeModule?.startSession(locale);
  }, []);

  const stopSession = useCallback(() => {
    NativeModule?.stopSession();
  }, []);

  const pauseProcessing = useCallback(() => {
    NativeModule?.pauseProcessing();
  }, []);

  const resumeProcessing = useCallback(() => {
    NativeModule?.resumeProcessing();
  }, []);

  return { startSession, stopSession, pauseProcessing, resumeProcessing, isSupported };
}
