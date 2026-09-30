import { beyond, clarity } from '../../systems/perception';
import { compact, format, type DebugSubject } from './subject';

export const DISPLAY_SUBJECTS: DebugSubject[] = [
  {
    id: 'scene',
    chapter: 'display',
    name: 'Le décor',
    description: 'La pièce qui s’éclaire avec les pages traversées.',
    peek: (state) => `${compact(state.totalPagesRead)} traversées`,
    build: (kit, state) => {
      kit.number(
        'Pages traversées',
        () => state.totalPagesRead,
        (v) => (state.totalPagesRead = v),
        { hint: 'La pièce est révélée vers 2 500.' },
      );
      kit.info('Découverte', () => format(clarity(state)));
      kit.info('Au-delà', () => format(beyond(state)));
    },
  },
];
