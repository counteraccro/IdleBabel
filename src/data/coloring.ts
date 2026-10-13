/**
 * « Colorie la Bibliothèque » (livre rare, décidé avec l'auteur le 13/10/2026 ; maquette .ai/maquette-coloriage.html) :
 * les neuf grands dessins du cahier, dans l'ordre, et la boîte de crayons de chacun.
 */
export const COLORING_DRAWINGS = [
  { id: 'tower', palette: ['#4f9fd8', '#f4c430', '#d8492f', '#e0a060', '#5aa84a', '#8a5a34'] },
  { id: 'lamp', palette: ['#1f3a7a', '#f6d24a', '#9a6436', '#c8372d', '#3f8f5a', '#e88ca0'] },
  { id: 'letter', palette: ['#e8b830', '#7a3e9a', '#f2c6a0', '#3a6ab8', '#c8372d', '#5aa84a'] },
  { id: 'rabbit', palette: ['#c9c4bc', '#f0a0b0', '#5aa84a', '#f08a24', '#8ac4ec', '#f4c430'] },
  { id: 'shelf', palette: ['#9a6436', '#c8372d', '#2f5a9a', '#3f8f5a', '#e0b040', '#7a4a9a'] },
  { id: 'desert', palette: ['#f0c860', '#e08a3a', '#8ac4ec', '#5aa84a', '#b85a3a', '#3a7ab8'] },
  { id: 'clock', palette: ['#8a5a34', '#e8c870', '#2a2a3a', '#6a8ac8', '#c8372d', '#3f8f5a'] },
  { id: 'night', palette: ['#1f2f6a', '#f6d24a', '#5a3a8a', '#3f7f5a', '#c8372d', '#e8e0c8'] },
  { id: 'mimic', palette: ['#7a3e2a', '#efe0b8', '#6a1a2a', '#e07a8a', '#f0c830', '#5a8a9a'] },
] as const;

export type ColoringDrawingId = (typeof COLORING_DRAWINGS)[number]['id'];
