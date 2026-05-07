/**
 * Lookup tables for English word-numbers and common Speech-to-Text homophones.
 * Kept in a separate file so the parser stays compact and the maps are easy
 * to extend (e.g. adding Tamil/Hindi tokens later).
 */

export const ONES: Record<string, number> = {
  zero: 0, oh: 0, nought: 0, naught: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

export const TENS: Record<string, number> = {
  twenty: 20, thirty: 30,
  forty: 40, fourty: 40,            // common misspelling
  fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

/**
 * Words that the STT engine sometimes returns when the speaker intended a digit.
 * Add new entries based on real telemetry from your users.
 */
export const HOMOPHONES: Record<string, string> = {
  for: 'four',
  fore: 'four',
  to: 'two',
  too: 'two',
  ate: 'eight',
  won: 'one',
  tree: 'three',     // Indian-English variant
  free: 'three',     // Indian-English variant
  sex: 'six',
  knight: 'nine',
  fife: 'five',
  tin: 'ten',
};

/** Multiplicative scales — supports Indian numbering (lakh, crore) too. */
export const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  lakh: 100_000,
  lac: 100_000,
  million: 1_000_000,
  crore: 10_000_000,
  billion: 1_000_000_000,
};

export const NEGATIVE_TOKENS = new Set(['minus', 'negative', 'neg', 'less']);
export const DECIMAL_TOKENS = new Set(['point', 'dot', 'decimal']);
