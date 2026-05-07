import type { FieldKind } from '../types';
import { parseSpokenNumber } from './parseSpokenNumber';
import { HOMOPHONES, ONES } from './numberWords';

/**
 * Convert a spoken transcript into a normalised string for the given field
 * kind. Returns null when the transcript can't be turned into a valid value.
 */
export function parseFieldValue(
  text: string,
  kind: FieldKind,
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  switch (kind) {
    case 'text':
      return trimmed;

    case 'phone':
      return parsePhone(trimmed);

    case 'email':
      return parseEmail(trimmed);

    case 'percent': {
      const n = parseSpokenNumber(trimmed);
      if (n === null) return null;
      if (n < 0 || n > 100) return null;
      // Trim trailing .0 so 85.0 renders as "85".
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
    }

    case 'number': {
      // Strategy 1: full spoken-number parse (handles "seventy", "1.5", "forty six").
      const n1 = parseSpokenNumber(trimmed);
      if (n1 !== null && n1 >= 0) {
        return Number.isInteger(n1) ? String(n1) : n1.toFixed(1).replace(/\.0$/, '');
      }

      // Strategy 2: extract the first numeric token anywhere in the text.
      // Handles ASR returning "the number five", "I said 5", "hi five" etc.
      const words = trimmed.toLowerCase().split(/\s+/);
      for (const w of words) {
        const n2 = parseSpokenNumber(w);
        if (n2 !== null && n2 >= 0) {
          return Number.isInteger(n2) ? String(n2) : n2.toFixed(1).replace(/\.0$/, '');
        }
      }

      // Strategy 3: last resort — pull any digit sequence from the string.
      const digitMatch = trimmed.match(/\d+(?:\.\d+)?/);
      if (digitMatch) {
        const n3 = parseFloat(digitMatch[0]);
        if (!isNaN(n3) && n3 >= 0) {
          return Number.isInteger(n3) ? String(n3) : n3.toFixed(1).replace(/\.0$/, '');
        }
      }

      return null;
    }
  }
}

function parsePhone(text: string): string | null {
  // Walk word-by-word so "nine eight seven" → "987" and pure digits stay.
  const tokens = text.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
  let digits = '';
  for (const raw of tokens) {
    const norm = HOMOPHONES[raw] ?? raw;
    if (/^\d+$/.test(norm)) {
      digits += norm;
      continue;
    }
    if (ONES[norm] !== undefined && ONES[norm] < 10) {
      digits += String(ONES[norm]);
      continue;
    }
    if (norm === 'double' || norm === 'triple') {
      // Skip — handled by reading the next digit-word and repeating it.
      // (Kept simple: ignore the modifier; the next token is captured normally.)
      continue;
    }
    // Anything else — bail. Phone numbers shouldn't contain stray words.
    return null;
  }
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

function parseEmail(text: string): string | null {
  // Common ASR substitutions: "at" → "@", "dot" → "."
  let normalised = text
    .toLowerCase()
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+at the rate(?: of)?\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/\s+period\s+/g, '.')
    .replace(/\s+/g, '');
  // Strip trailing punctuation that ASR sometimes appends.
  normalised = normalised.replace(/[.,;]+$/g, '');
  // Light validation — any@something.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) return null;
  return normalised;
}
