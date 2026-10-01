/**
 * Le code cité dans la biographie : des extraits de quelques lignes (les blocs dans le récit) et des
 * lignes de diff (les « photos » du cahier). Du code, pas du texte : le même dans toutes les langues.
 */
export const SNIPPETS: readonly string[][] = [
  ['function hello() {', "  console.log('Hello, world');", '}'],
  ['// TODO: clean this up', 'const data = await fetch(url);', 'return data; // works'],
  ['if (user == null) {', '  // should never happen', '  throw new Error("lol");', '}'],
  ['try {', '  deploy(prod);', '} catch (e) {', '  // ignore', '}'],
  ['<<<<<<< HEAD', 'const timeout = 30;', '=======', 'const timeout = 3000;', '>>>>>>> feature/fix'],
  ['git commit -m "wip"', 'git commit -m "wip 2"', 'git commit -m "fix"', 'git commit -m "real fix"'],
  ['const isFriday = new Date().getDay() === 5;', 'if (isFriday) deploy(); // what could go wrong'],
  ['// do not touch', '// seriously', 'const MAGIC = 410;'],
  ['while (bug) {', '  coffee++;', '}'],
  ['git push --force', '# sorry'],
  ['export const temporary = () => {', '  // since 2019', '};'],
  ['it.skip("works", () => {', '  expect(true).toBe(true);', '});'],
];

/** Une ligne de diff : retirée (−), ajoutée (+) ou inchangée. */
export interface DiffLine {
  kind: '-' | '+' | ' ';
  text: string;
}

/** Les lignes d'un diff, tirées des extraits : quelques-unes retirées, d'autres ajoutées, autour d'un contexte. */
export const diffLines = (random: () => number, count: number): DiffLine[] => {
  const pool = SNIPPETS.flat();
  return Array.from({ length: count }, (_, index) => {
    const roll = random();
    const kind = index < 2 || roll < 0.3 ? ' ' : roll < 0.6 ? '-' : '+';
    return { kind, text: pool[Math.floor(random() * pool.length)] };
  });
};
