import {
  ONES,
  TENS,
  HOMOPHONES,
  SCALES,
  NEGATIVE_TOKENS,
  DECIMAL_TOKENS,
} from './numberWords';

/**
 * Convert a list of word tokens into a non-negative integer.
 * Used for the integer side of the decimal split.
 *
 * Examples:
 *   ['seventy']                    -> 70
 *   ['one','hundred','twenty']     -> 120
 *   ['two','thousand','five']      -> 2005
 */
function wordsToInteger(tokens: string[]): number | null {
  if (tokens.length === 0) return null;

  // Pure digits like "70", "1", "1.5"
  if (tokens.length === 1 && /^-?\d+(\.\d+)?$/.test(tokens[0])) {
    return parseFloat(tokens[0]);
  }

  let total = 0;
  let current = 0;
  let matched = false;

  for (const raw of tokens) {
    const t = HOMOPHONES[raw] ?? raw;

    // Filler we just skip
    if (t === 'and' || t === ',' || t === '-' || t === '') continue;

    if (ONES[t] !== undefined) {
      current += ONES[t];
      matched = true;
      continue;
    }
    if (TENS[t] !== undefined) {
      current += TENS[t];
      matched = true;
      continue;
    }
    if (SCALES[t] !== undefined) {
      const scale = SCALES[t];
      if (current === 0) current = 1;
      if (scale === 100) {
        current *= 100;
      } else {
        total += current * scale;
        current = 0;
      }
      matched = true;
      continue;
    }
    // Bare digit mid-stream e.g. "twenty 5"
    if (/^\d+$/.test(t)) {
      current += parseInt(t, 10);
      matched = true;
      continue;
    }

    return null; // unknown token — give up
  }

  if (!matched) return null;
  return total + current;
}

/**
 * Parse a spoken phrase into a JS number.
 *
 * Accepts:
 *   - Plain digits           "70", "1.5", "-0.5", "+3"
 *   - Word numbers           "seventy", "one hundred twenty"
 *   - Decimals (English)     "one point five", "zero point two"
 *   - Negatives              "minus one", "negative zero point five"
 *   - Common STT homophones  "for" -> 4, "to" -> 2, "ate" -> 8
 *
 * Returns null when the string can't be interpreted as a number.
 */
export function parseSpokenNumber(input: string): number | null {
  if (!input) return null;

  // Normalise: lowercase, replace punctuation with spaces, collapse whitespace
  const cleaned = input
    .toLowerCase()
    .replace(/[^\w\s.\-,+]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  // Direct numeric form: "70", "1.5", "-0.5", "+3"
  const compact = cleaned.replace(/\s+/g, '');
  if (/^[+-]?\d+(\.\d+)?$/.test(compact)) {
    return parseFloat(compact);
  }

  let tokens = cleaned.split(' ');
  let isNegative = false;

  if (tokens.length && NEGATIVE_TOKENS.has(tokens[0])) {
    isNegative = true;
    tokens = tokens.slice(1);
  } else if (tokens.length && tokens[0].startsWith('-')) {
    isNegative = true;
    tokens[0] = tokens[0].slice(1);
  }

  // Find the decimal token, if any
  const decimalIdx = tokens.findIndex(t => DECIMAL_TOKENS.has(t));

  let integerPart: number | null = 0;
  let decimalPart = 0;

  if (decimalIdx === -1) {
    integerPart = wordsToInteger(tokens);
    if (integerPart === null) return null;
  } else {
    const intTokens = tokens.slice(0, decimalIdx);
    const decTokens = tokens.slice(decimalIdx + 1);

    integerPart = intTokens.length === 0 ? 0 : wordsToInteger(intTokens);
    if (integerPart === null) return null;

    // After the decimal token, each token is read as a single digit.
    let decimalStr = '';
    for (const t of decTokens) {
      const norm = HOMOPHONES[t] ?? t;
      if (/^\d+$/.test(norm)) {
        decimalStr += norm;
      } else if (ONES[norm] !== undefined && ONES[norm] < 10) {
        decimalStr += ONES[norm];
      } else {
        return null;
      }
    }
    if (decimalStr.length === 0) return null;
    decimalPart = parseFloat(`0.${decimalStr}`);
  }

  const result = integerPart + decimalPart;
  return isNegative ? -result : result;
}
