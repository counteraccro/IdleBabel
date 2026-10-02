/**
 * Les noms du DeathBook : des lecteurs venus de partout, prénoms et noms mêlés au hasard (personne de
 * réel). Les mêmes dans toutes les langues : un nom ne se traduit pas.
 */
const FIRST = (
  'Ilse Tomás Aiko Yusuf Margit Oskar Leila Anselme Dagny Kofi Ingrid Matteo Noor Piotr Solveig Haruto ' +
  'Amara Bertrand Zofia Emeka Lucía Viktor Mireille Rashid Elif Gaspard Nadia Teodor Yara Ansel Chiara ' +
  'Dmitri Esther Felipe Greta Hamid Irène Jonas Kalinda Lorcan Maren Nikolai Odile Pablo Rosalind ' +
  'Saoirse Tariq Ulla'
).split(' ');
const LAST = (
  'Marquardt Echeverría Tanabe Okonkwo Lindqvist Brandt Haddad Rocheteau Kowalczyk Mensah Varga ' +
  'Castellanos Nakamura Duval Petrov Albrecht Moreau Szabó Abiodun Ferreira Halvorsen Ivanova Jaramillo ' +
  'Keller Lebrun Mazur Nieminen Oyelaran Pellegrini Quist Rahimi Sandoval Thibault Uchida Vasquez Weiss ' +
  'Yilmaz Zielinski Arnaud Borg'
).split(' ');

/** Un nom, tiré par `random` (toujours le même pour le même tirage). */
export const deathName = (random: () => number): string =>
  `${FIRST[Math.floor(random() * FIRST.length)]} ${LAST[Math.floor(random() * LAST.length)]}`;
