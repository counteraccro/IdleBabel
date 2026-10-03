import { describe, expect, it } from 'vitest';
import { FIRST_YEAR, LAST_YEAR, season } from '../src/ui/rareBooks/almanac/almanacSeasons';

const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, k) => FIRST_YEAR + k);

describe("l'Almanach des sports", () => {
  it('le championnat se tient : 34 matchs par club, points et buts comptés juste', () => {
    for (const year of years) {
      const { rows, win } = season(year).league;
      expect(win).toBe(year >= 1995 ? 3 : 2);
      for (const row of rows) {
        expect(row.p).toBe(34);
        expect(row.w + row.d + row.l).toBe(34);
        expect(row.pts).toBe(row.w * win + row.d);
      }
      expect(rows.reduce((sum, row) => sum + row.f, 0)).toBe(rows.reduce((sum, row) => sum + row.a, 0));
      for (let i = 1; i < rows.length; i++) expect(rows[i - 1].pts).toBeGreaterThanOrEqual(rows[i].pts);
    }
  });

  it('la coupe, la boxe, le base-ball et le tennis ont un vainqueur possible', () => {
    for (const year of years) {
      const s = season(year);
      expect(s.cup.rounds.map((round) => round.length)).toEqual([4, 2, 1]);
      expect(s.cup.scorers.length).toBe(s.cup.final.x + s.cup.final.y);
      for (const bout of s.boxing) expect(bout.winner).not.toBe(bout.loser);
      expect(Math.max(s.ball.a, s.ball.b)).toBe(4);
      for (const match of s.tennis) expect(match.score.split(' ').filter((set) => set.startsWith('6-')).length).toBe(2);
    }
  });

  it('un tenant de la boxe défend le titre gagné l’année d’avant', () => {
    for (const year of years.slice(1))
      season(year).boxing.forEach((bout, weight) => {
        const holder = season(year - 1).boxing[weight].winner;
        expect([bout.winner, bout.loser]).toContain(holder);
      });
  });

  it('les records ne font que tomber', () => {
    for (const year of years.slice(1))
      season(year).records.forEach((record, event) => {
        const before = season(year - 1).records[event];
        if (!record.fresh) expect(record.value).toBe(before.value);
      });
  });

  it('les mêmes résultats à chaque lecture', () => {
    expect(season(1957).champions).toEqual(['FC Gérance', 'Stade Brévannais', 'Rocco Quillet', 'Marque-Page', 'Redcliff Miners', 'Carlos Dobrev']);
  });
});
