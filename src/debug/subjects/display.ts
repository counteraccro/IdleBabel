import { beyond, clarity } from '../../systems/perception';
import { format, type DebugSubject } from './subject';

export const DISPLAY_SUBJECTS: DebugSubject[] = [
  {
    id: 'scene',
    chapter: 'display',
    name: 'Le décor',
    description: 'La pièce qui s’éclaire avec les pages lues à vie.',
    build: (kit, state) => {
      kit.info('Découverte', () => format(clarity(state)));
      kit.info('Au-delà', () => format(beyond(state)));
      kit.number(
        'Pages lues à vie',
        () => state.totalPagesRead,
        (v) => (state.totalPagesRead = v),
        'la pièce est révélée vers 2 500',
      );
    },
  },
];
