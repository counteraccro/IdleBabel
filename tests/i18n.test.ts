import { describe, expect, it } from 'vitest';
import { LOCALES, REFERENCE_LOCALE } from '../src/i18n/locales';

/** Liste toutes les clés « a.b.c » d'un objet de traductions. */
const keysOf = (node: unknown, prefix = ''): string[] =>
  Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

describe('traductions', () => {
  const reference = keysOf(LOCALES[REFERENCE_LOCALE]).sort();

  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} a exactement les mêmes clés que le français`, () => {
      expect(keysOf(messages).sort()).toEqual(reference);
    });
  }
});
