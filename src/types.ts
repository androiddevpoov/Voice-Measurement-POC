/**
 * Measurement table types.
 * Each row = one garment measurement.
 * Voice fills: s, sDiff1-4, m, mDiff1-4 (10 cells per row).
 */

export type FieldKind = 'text' | 'email' | 'phone' | 'percent' | 'number';

/** Columns filled by voice (10 per row). */
export interface MeasurementRow {
  id: string;
  label: string;        // shown in table
  spokenLabel: string;  // TTS-friendly version of label
  tolPlus: number;
  tolMinus: number;
  // S-size columns
  s: string;
  sDiff1: string;
  sDiff2: string;
  sDiff3: string;
  sDiff4: string;
  // M-size columns
  m: string;
  mDiff1: string;
  mDiff2: string;
  mDiff3: string;
  mDiff4: string;
}

/** Flat Field used by useVoiceFlow voice engine. */
export interface Field {
  id: string;
  label: string;
  spokenPrompt: string;
  kind: FieldKind;
  value: string;
}

export type AppState = 'idle' | 'speaking' | 'listening' | 'processing';
export type LocaleCode = 'en-IN' | 'en-US' | 'ta-IN' | 'hi-IN';

export type VoiceCommand =
  | 'skip'
  | 'repeat'
  | 'back'
  | 'cancel'
  | 'next'
  | 'save'
  | 'close'
  | 'yes'
  | 'no';
