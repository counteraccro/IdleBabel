import { describe, expect, it } from 'vitest';
import { readReaderNameWith, trueName, withReaderName } from '../src/systems/readerName';
import { LETTERS } from '../src/systems/babelText';

describe('nom du joueur dans les phrases', () => {
  it('remplace {name} et {babel}, le vrai nom toujours le même pour un nom', () => {
    readReaderNameWith(() => 'Aymeric');
    const text = withReaderName('{name}, mais {babel}.');
    expect(text).toBe(`Aymeric, mais ${trueName('Aymeric')}.`);
    expect(trueName('aymeric')).toBe(trueName('Aymeric'));
    expect(trueName('Aymeric')).not.toBe(trueName('Borges'));
    expect([...trueName('Aymeric')].every((letter) => LETTERS.includes(letter))).toBe(true);
  });

  it('tient debout sans nom (partie pas encore présentée)', () => {
    readReaderNameWith(() => '');
    expect(withReaderName('{name}')).toBe('…');
  });
});
