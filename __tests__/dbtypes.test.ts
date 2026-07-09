import { OPINIONS, CHANGE_LEVELS } from '../src/types/db';

it('domain enums', () => {
  expect(OPINIONS).toEqual(['hold', 'watch', 'reduce', 'exit']);
  expect(CHANGE_LEVELS).toEqual(['none', 'minor', 'major']);
});
