/**
 * Simulateur de temps de jeu (demande de l'auteur, 05/10) : un bot joue des parties et des prestiges de suite,
 * avec les chiffres du jeu (src/data) et ceux proposés (simulateur/config.ts), pour caler les prix de l'Etherium.
 *
 *   npm run simule                       30 jours de jeu sans fermer le jeu
 *   npm run simule -- --jours=60 --rythme=2,22 --sans-cornee --porte=échelle --prestige=taux
 *   npm run simule -- --pages=reading,hands    le bot n'allume que les étoiles de ces pages (et l'Âge Automatique)
 *   npm run simule -- --sceaux=30 --sans-ether-lecture   sceaux fixes, sans la lecture de l'Éther reçu (comme avant le 07/10)
 *   npm run simule -- --partie-max=96          parties de 96 heures de jeu au plus (absences non comprises)
 *   npm run simule -- --lettres=0              sans la lettre qui s'échappe (0,5 : le bot en attrape une sur deux)
 *   npm run simule -- --numerique=500          l'étoile de l'Âge Numérique à 500 Éther (1 500 dans le jeu)
 *   npm run simule -- --sans-bit               sans le Bit, méthode secrète de l'Âge Numérique
 *   npm run simule -- --sans-poids             sans le poids de la Bibliothèque (lecture de l'Éther freinée au-delà de 5 000)
 *   npm run simule -- --lecture=auto:0.1       la lecture des méthodes d'un Âge multipliée (manual, auto, num)
 *   npm run simule -- --methode=voice:12000:18 une méthode du jeu à un autre prix (et une autre lecture)
 *   npm run simule -- --sans-taches          sans les tâches (simulateur/taches.ts, pas encore dans le jeu)
 *   npm run simule -- --sans-jeton           le bot ne pose pas le Jeton (la relique de la Loterie)
 */
import { PLAYER } from './config';
import type { PageId } from '../src/data/etheriumStars';
import { AUTOMATIC, BIT, DIGITAL } from './methodes';
import { away, buyMethods, newRun, pagesPerSecond, play, type Run } from './partie';
import { buyIntuitions } from './intuitions';
import { etherGain, litPerPage, newLife, spendEther } from './vie';
import { checkSeals, sealCount, sealsPerPlate } from './sceaux';
import { LAST_TASK, ONCE_TASKS, TASK_STARS } from './taches';

const option = (name: string): string | undefined =>
  process.argv.find((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`))?.split('=')[1] ??
  (process.argv.includes(`--${name}`) ? '' : undefined);

const days = Number(option('jours') ?? 30);
if (option('rythme')) PLAYER.rhythm = option('rythme')!.split(',').map(Number) as [number, number];
if (option('porte') === 'échelle') PLAYER.automaticGate = 'échelle';
if (option('prestige') === 'taux') PLAYER.prestige = 'taux';
if (option('sans-cornee') !== undefined) PLAYER.cornee = false;
if (option('partie-max')) PLAYER.maxRunHours = Number(option('partie-max'));
if (option('sceaux')) PLAYER.seals = Number(option('sceaux'));
if (option('sans-ether-lecture') !== undefined) PLAYER.etherReading = false;
if (option('sans-poids') !== undefined) PLAYER.weight = false;
if (option('lettres') !== undefined) PLAYER.letters = Number(option('lettres'));
if (option('numerique')) PLAYER.digitalAge = Number(option('numerique'));
if (option('sans-bit') !== undefined) PLAYER.bit = false;
if (option('sans-taches') !== undefined) PLAYER.tasks = false;
if (option('sans-jeton') !== undefined) PLAYER.tokenRelic = false;
// L'Âge Automatique reste toujours possible (ages) ; les autres pages, seulement celles demandées.
if (option('pages')) PLAYER.pages = [...(option('pages')!.split(',') as PageId[]), 'ages'];

const duration = (seconds: number | undefined): string => {
  if (seconds === undefined) return '—';
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)} min`;
  if (hours < 48) return `${hours.toFixed(1).replace('.', ',')} h`;
  return `${(hours / 24).toFixed(1).replace('.', ',')} j`;
};
/** Durée en bref, pour la colonne des méthodes Automatiques : 45m, 3h, 2j. */
const short = (seconds: number | undefined): string => {
  if (seconds === undefined) return '–';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}j`;
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
    checkSeals(run);
    const gain = etherGain(run.life, run.read);
    if (gain < 1) continue;
    if (run.played >= PLAYER.maxRunHours * 3600) return gain;
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
  checkSeals(run);
  const firstAutomatic = run.firstBought[AUTOMATIC[0].id];
  const row = [
    String(number),
    duration(run.t),
    big(run.read),
    big(pagesPerSecond(run)),
    // Première fois que chaque méthode Manuelle s'achète (le Doigt, la Voix, le Lutrin, l'Échelle).
    ['finger', 'voice', 'lectern', 'ladder'].map((id) => short(run.firstBought[id])).join(' · '),
    duration(run.firstBought.cornee),
    duration(firstAutomatic),
    // Première fois que chaque méthode Automatique s'achète dans la partie (– : jamais).
    AUTOMATIC.map((method) => short(run.firstBought[method.id])).join(' · '),
    // Pareil pour l'Âge Numérique.
    DIGITAL.map((method) => short(run.firstBought[method.id])).join(' · '),
    short(run.firstBought.bit),
    // Connaissance gagnée dans la partie ; niveaux des intuitions de l'Âge Numérique (le Bit en dernier).
    big(run.knowledgeGained),
    [...DIGITAL, BIT].map((method) => run.levels[method.gesture!] ?? 0).join(''),
    String(sealCount(run)),
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
  life.prestiges += 1;
  const bought = spendEther(life);
  rows.push([...row, String(life.etherReceived), bought.join(', '), duration(life.clock)]);
}

const header = [
  'n°',
  'durée',
  'pages lues',
  'pages/s fin',
  'Doigt · Voix · Lutrin · Échelle',
  'Cornée',
  '1re Auto',
  'Auto 1 · 2 · 3 · 4 · 5',
  'Num 1 · 2 · 3 · 4 · 5',
  'Bit',
  'Conn.',
  'Int. Num',
  'sceaux',
  'Éther',
  'total',
  'achats au réveil',
  'temps total',
];
const widths = header.map((title, i) => Math.max(title.length, ...rows.map((row) => row[i].length)));
const line = (cells: string[]): string => cells.map((cell, i) => cell.padEnd(widths[i])).join('  ');
console.log(
  `${days} jours · rythme ${PLAYER.rhythm.join(' h de jeu / ')} h fermé · porte de l'Âge Automatique : ${PLAYER.automaticGate} · prestige : ${PLAYER.prestige} · sceaux : ${PLAYER.seals} · lecture de l'Éther : ${PLAYER.etherReading ? 'oui' : 'non'} · lettres attrapées : ${PLAYER.letters}`,
);
console.log(line(header));
rows.forEach((row) => console.log(line(row)));
console.log(`Sceaux : ${sealsPerPlate(life.seals)} (+ ${PLAYER.otherSeals} livres rares et secrets)`);
console.log(
  `Loterie : ${life.lottery.draws} jetons joués (dont ${Math.floor(life.lottery.daily)} du Jeton, trouvé : ${duration(life.lottery.tokenAt)}) · page ouverte : ${duration(life.lottery.openedAt)} · étoiles achetées : ${[...life.stars].filter((id) => id.startsWith('lottery.')).join(', ') || 'aucune'}`,
);
console.log(`Éther reçu : ${life.etherReceived} · non dépensé : ${life.etherFree} · étoiles : ${litPerPage(life)}`);

const tasks = life.tasks;
if (PLAYER.tasks) {
  console.log(
    `Tâches : étoiles ${TASK_STARS.map((star) => `${star.id} ${duration(tasks.boughtAt[star.id])}`).join(' · ')}`,
  );
  console.log(
    `Tâches du jour faites : ${tasks.dailyDone} · jetons des tâches du jour : ${tasks.dailyTokens} · des tâches « une seule fois » : ${tasks.onceTokens} · jetons joués en tout : ${life.lottery.draws}`,
  );
  console.log(
    `Bonus pour toujours : lecture +${Math.round(tasks.readingBonus * 100)} %, Connaissance +${Math.round(tasks.knowledgeBonus * 100)} % · Crayon : ${duration(tasks.crayonAt)}`,
  );
  for (const task of ONCE_TASKS) {
    const shown = tasks.shown[task.n];
    const done = tasks.done[task.n];
    const followed = task.count ? '' : ' (pas suivie)';
    console.log(
      `  ${String(task.n).padStart(2)}. ${task.label.padEnd(36)} apparue ${duration(shown?.at).padEnd(7)} faite ${done === undefined ? '—' : `${duration(done)} (en ${duration(done - shown.at)})`}${followed}`,
    );
  }
  const last = tasks.last;
  console.log(
    last
      ? `Une dernière pour la route : apparue ${duration(last.at)} · Éther dépensé ${big(last.ether)} / ${big(LAST_TASK.ether)} · pages ${big(last.pages)} / ${big(LAST_TASK.pages)} · Connaissance ${big(last.knowledge)} / ${big(LAST_TASK.knowledge)} · faite ${duration(last.doneAt)}`
      : 'Une dernière pour la route : pas apparue',
  );
}
