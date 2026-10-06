/**
 * Simulateur de temps de jeu (demande de l'auteur, 05/10) : un bot joue des parties et des prestiges de suite,
 * avec les chiffres du jeu (src/data) et ceux proposés (simulateur/config.ts), pour caler les prix de l'Etherium.
 *
 *   npm run simule                       30 jours de jeu sans fermer le jeu
 *   npm run simule -- --jours=60 --rythme=2,22 --sans-cornee --porte=échelle --prestige=taux
 *   npm run simule -- --pages=reading,hands    le bot n'allume que les étoiles de ces pages (et l'Âge Automatique)
 */
import { PLAYER } from './config';
import type { PageId } from './etoiles';
import { AUTOMATIC } from './config';
import { away, buyMethods, newRun, pagesPerSecond, play, type Run } from './partie';
import { buyIntuitions } from './intuitions';
import { etherGain, litPerPage, newLife, spendEther } from './vie';

const option = (name: string): string | undefined =>
  process.argv.find((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`))?.split('=')[1] ??
  (process.argv.includes(`--${name}`) ? '' : undefined);

const days = Number(option('jours') ?? 30);
if (option('rythme')) PLAYER.rhythm = option('rythme')!.split(',').map(Number) as [number, number];
if (option('porte') === 'échelle') PLAYER.automaticGate = 'échelle';
if (option('prestige') === 'taux') PLAYER.prestige = 'taux';
if (option('sans-cornee') !== undefined) PLAYER.cornee = false;
// L'Âge Automatique reste toujours possible (ages) ; les autres pages, seulement celles demandées.
if (option('pages')) PLAYER.pages = [...(option('pages')!.split(',') as PageId[]), 'ages'];

const duration = (seconds: number | undefined): string => {
  if (seconds === undefined) return '—';
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)} min`;
  if (hours < 48) return `${hours.toFixed(1).replace('.', ',')} h`;
  return `${(hours / 24).toFixed(1).replace('.', ',')} j`;
};
const big = (n: number): string => (n < 1e6 ? String(Math.round(n)) : n.toExponential(1).replace('.', ','));

const [active, closed] = PLAYER.rhythm.map((hours) => hours * 3600);

/** Joue jusqu'au prestige (rend l'Éther gagné), ou jusqu'à la fin du temps simulé (rend 0). */
const playRun = (run: Run, end: number): number => {
  let bestRate = 0;
  while (run.life.clock < end) {
    const phase = run.life.clock % (active + closed);
    if (closed > 0 && phase >= active) away(run, active + closed - phase);
    else play(run, run.t < 3600 ? 1 : 5);
    buyMethods(run);
    buyIntuitions(run);
    if (run.t % 60 >= 5) continue;
    const gain = etherGain(run.life, run.read);
    if (gain < 1) continue;
    if (run.t >= PLAYER.maxRunHours * 3600) return gain;
    if (PLAYER.prestige === 'double' && gain >= run.life.etherReceived) return gain;
    const rate = gain / run.t;
    bestRate = Math.max(bestRate, rate);
    if (PLAYER.prestige === 'taux' && rate < PLAYER.prestigeWhenRateBelow * bestRate) return gain;
  }
  return 0;
};

const life = newLife();
const end = days * 86400;
const rows: string[][] = [];
for (let number = 1; life.clock < end; number++) {
  const run = newRun(life);
  const gain = playRun(run, end);
  const firstAutomatic = run.firstBought[AUTOMATIC[0].id];
  const row = [
    String(number),
    duration(run.t),
    big(run.read),
    big(pagesPerSecond(run)),
    duration(run.firstBought.cornee),
    duration(firstAutomatic),
    gain > 0 ? `+${gain}` : '(en cours)',
  ];
  if (gain === 0) {
    rows.push([...row, String(life.etherReceived), '', duration(life.clock)]);
    break;
  }
  life.pages += run.read;
  life.previous = { owned: { ...run.owned }, read: run.read, knowledge: run.knowledgeGained, levels: { ...run.levels } };
  life.etherReceived += gain;
  life.etherFree += gain;
  const bought = spendEther(life);
  rows.push([...row, String(life.etherReceived), bought.join(', '), duration(life.clock)]);
}

const header = ['n°', 'durée', 'pages lues', 'pages/s fin', 'Cornée', '1re Auto', 'Éther', 'total', 'achats au réveil', 'temps total'];
const widths = header.map((title, i) => Math.max(title.length, ...rows.map((row) => row[i].length)));
const line = (cells: string[]): string => cells.map((cell, i) => cell.padEnd(widths[i])).join('  ');
console.log(
  `${days} jours · rythme ${PLAYER.rhythm.join(' h de jeu / ')} h fermé · porte de l'Âge Automatique : ${PLAYER.automaticGate} · prestige : ${PLAYER.prestige}`,
);
console.log(line(header));
rows.forEach((row) => console.log(line(row)));
console.log(`Éther reçu : ${life.etherReceived} · non dépensé : ${life.etherFree} · étoiles : ${litPerPage(life)}`);
