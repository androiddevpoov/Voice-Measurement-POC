import type { VoiceCommand } from '../types';

/**
 * Synonym table for each command. Keep these short — long phrases are slow
 * to match and rarely useful. Use lowercase only; matching is case-insensitive.
 */
const COMMAND_SYNONYMS: Record<VoiceCommand, string[]> = {
  skip:   ['skip', 'pass', 'leave blank', 'leave it blank', 'no value', 'empty'],
  repeat: ['repeat', 'again', 'say again', 'one more time', 'come again', 'pardon'],
  back:   ['back', 'previous', 'go back', 'last one', 'undo'],
  cancel: ['cancel', 'wrong', 'discard', 'reset', 'redo'],
  next:   ['next', 'continue', 'go on', 'forward', 'proceed', 'move on'],
  save:   ['save', 'submit', 'finish', 'done', 'store', 'record'],
  close:  ['close', 'stop', 'exit', 'end', 'quit', 'finish session', 'pause'],
  yes:    ['yes', 'yeah', 'yep', 'correct', 'right', 'okay', 'ok'],
  no:     ['no', 'nope', 'incorrect'],
};

/**
 * Detect a voice command in the transcript.
 *
 * Returns the command if found, otherwise null. Matches whole words only —
 * "okay skip this one" matches `skip`, but "skipping" does not.
 */
export function detectCommand(input: string): VoiceCommand | null {
  if (!input) return null;
  const text = input.toLowerCase().trim();

  // 1) Exact whole-utterance match — highest priority
  for (const [cmd, phrases] of Object.entries(COMMAND_SYNONYMS) as [
    VoiceCommand,
    string[],
  ][]) {
    if (phrases.includes(text)) return cmd;
  }

  // 2) Whole-word substring match
  for (const [cmd, phrases] of Object.entries(COMMAND_SYNONYMS) as [
    VoiceCommand,
    string[],
  ][]) {
    for (const p of phrases) {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      if (re.test(text)) return cmd;
    }
  }
  return null;
}
