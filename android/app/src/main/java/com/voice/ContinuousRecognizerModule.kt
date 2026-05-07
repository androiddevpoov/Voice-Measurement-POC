package com.voice

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * ContinuousRecognizerModule
 *
 * Keeps a single SpeechRecognizer alive for the entire voice-entry session.
 * The recognizer is paused (stopListening) during TTS and silently restarted
 * afterwards — no destroy/create → no audio-focus churn.
 *
 * The recognizer's "ding" activation sound is suppressed by muting STREAM_SYSTEM
 * ONCE at session start and restoring it ONCE at session stop.
 *
 * JS events emitted:
 *   ContinuousRecognizer.onReady       — mic open and ready
 *   ContinuousRecognizer.onPartial     — partial transcript (String)
 *   ContinuousRecognizer.onCandidates  — all ASR candidates (String[]) ordered by confidence
 *   ContinuousRecognizer.onError       — error code (String)
 *   ContinuousRecognizer.onSessionReset — error counter should reset
 */
class ContinuousRecognizerModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ContinuousRecognizer"

    private val mainHandler = Handler(Looper.getMainLooper())
    private val audioManager by lazy {
        reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    private var recognizer: SpeechRecognizer? = null
    private var sessionLocale: String = "en-IN"

    @Volatile private var processingEnabled = true
    @Volatile private var sessionActive = false

    // Errors within first 1.2 s of mic open are ignored (fire before user speaks).
    private var listenStartedAt: Long = 0L
    private val GRACE_PERIOD_MS = 1200L

    // System volume saved at session start, restored at session stop.
    private var savedSystemVolume: Int = -1

    private var partialBuffer = ""

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    @ReactMethod
    fun startSession(locale: String) {
        mainHandler.post {
            sessionLocale = locale
            sessionActive = true
            processingEnabled = true
            partialBuffer = ""
            // Mute STREAM_SYSTEM once — suppresses all "ding" sounds
            // for the duration of the session without repeated vibration.
            muteSystemStream()
            buildRecognizer()
            beginListening()
        }
    }

    @ReactMethod
    fun stopSession() {
        mainHandler.post {
            sessionActive = false
            processingEnabled = false
            destroyRecognizer()
            // Restore system volume now that the session is over.
            restoreSystemStream()
        }
    }

    /** Call BEFORE TTS speaks — physically stops mic so TTS isn't captured. */
    @ReactMethod
    fun pauseProcessing() {
        processingEnabled = false
        mainHandler.post {
            recognizer?.stopListening()
        }
    }

    /** Call AFTER TTS finishes.
     *  Phase 1 (50 ms): mic opens quickly.
     *  Phase 2 (+50 ms): accept results — echo filter handles any overlap. Total: 100 ms.
     */
    @ReactMethod
    fun resumeProcessing() {
        mainHandler.postDelayed({
            if (!sessionActive) return@postDelayed
            beginListening()
            mainHandler.postDelayed({
                if (!sessionActive) return@postDelayed
                processingEnabled = true
            }, 50)
        }, 50)
    }

    @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}
    @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {}

    // ------------------------------------------------------------------
    // Volume helpers (called ONCE per session, not per restart)
    // ------------------------------------------------------------------

    private fun muteSystemStream() {
        try {
            savedSystemVolume = audioManager.getStreamVolume(AudioManager.STREAM_SYSTEM)
            // Use flag 0 (no vibrate, no sound) — just silently set volume.
            audioManager.setStreamVolume(AudioManager.STREAM_SYSTEM, 0, 0)
        } catch (_: Exception) {}
    }

    private fun restoreSystemStream() {
        if (savedSystemVolume < 0) return
        try {
            audioManager.setStreamVolume(AudioManager.STREAM_SYSTEM, savedSystemVolume, 0)
            savedSystemVolume = -1
        } catch (_: Exception) {}
    }

    // ------------------------------------------------------------------
    // Recognizer helpers
    // ------------------------------------------------------------------

    private fun buildRecognizer() {
        destroyRecognizer()
        recognizer = SpeechRecognizer.createSpeechRecognizer(reactContext).apply {
            setRecognitionListener(listener)
        }
    }

    private fun destroyRecognizer() {
        recognizer?.destroy()
        recognizer = null
    }

    private fun beginListening() {
        if (!sessionActive) return
        listenStartedAt = System.currentTimeMillis()
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, sessionLocale)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra("android.speech.extra.SUPPRESS_INPUT_PROMPT", true)
            // Fast silence for short numeric answers (single digit measurements).
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 700L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 500L)
        }
        recognizer?.startListening(intent)
    }


    private fun restart(delayMs: Long = 100) {
        if (!sessionActive) return
        mainHandler.postDelayed({
            if (!sessionActive) return@postDelayed
            beginListening()
        }, delayMs)
    }

    private fun emit(event: String, value: String?) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, value)
    }

    private fun emitArray(event: String, array: WritableArray) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, array)
    }

    // ------------------------------------------------------------------
    // RecognitionListener
    // ------------------------------------------------------------------

    private val listener = object : RecognitionListener {

        override fun onReadyForSpeech(params: Bundle?) {
            if (processingEnabled) {
                emit("ContinuousRecognizer.onReady", null)
                // Signal JS to reset its error retry counter for this fresh listen session.
                emit("ContinuousRecognizer.onSessionReset", null)
            }
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val txt = partialResults
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()?.takeIf { it.isNotBlank() } ?: return
            partialBuffer = txt
            if (processingEnabled) emit("ContinuousRecognizer.onPartial", txt)
        }

        override fun onResults(results: Bundle?) {
            // Sort candidates by confidence score — highest first.
            val candidates = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?: emptyList<String>()
            val scores = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)

            val sorted = if (scores != null && scores.size == candidates.size) {
                candidates.indices
                    .sortedByDescending { scores[it] }
                    .map { candidates[it] }
            } else {
                candidates
            }.filter { it.isNotBlank() }

            // Add partial as last-resort fallback if not already in the list.
            val allCandidates = if (partialBuffer.isNotBlank() && !sorted.contains(partialBuffer)) {
                sorted + partialBuffer
            } else {
                sorted
            }
            partialBuffer = ""

            if (allCandidates.isEmpty()) { if (sessionActive) restart(); return }

            if (processingEnabled) {
                val arr = Arguments.createArray()
                allCandidates.forEach { arr.pushString(it) }
                emitArray("ContinuousRecognizer.onCandidates", arr)
                // DO NOT restart here — JS will call resumeProcessing() after the
                // field is filled and TTS asks the next question. Auto-restarting
                // opens the mic before pauseProcessing() runs, which causes TTS
                // audio to be captured as the next answer.
            } else {
                // During TTS — discard and silently restart to stay warm.
                restart()
            }
        }

        override fun onError(error: Int) {
            val withinGracePeriod =
                (System.currentTimeMillis() - listenStartedAt) < GRACE_PERIOD_MS

            // Rescue a partial even on error — send as single-item candidate list.
            if (processingEnabled && partialBuffer.isNotBlank()) {
                val captured = partialBuffer
                partialBuffer = ""
                val arr = Arguments.createArray()
                arr.pushString(captured)
                emitArray("ContinuousRecognizer.onCandidates", arr)
                restart(300)
                return
            }

            // Only surface the error to JS after the grace period.
            if (processingEnabled && !withinGracePeriod) {
                emit("ContinuousRecognizer.onError", "$error")
            }

            // Always restart to keep the mic warm.
            val delay = if (error == 11) 600L else 150L
            if (sessionActive) restart(delay)
        }

        override fun onBeginningOfSpeech() {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
        override fun onRmsChanged(rmsdB: Float) {}
    }
}
