import { toggleLine } from '../src/app/holding/new';

it('adds candidate line, keeps user text', () => {
  expect(toggleLine('', 'AI 수요 증가')).toBe('AI 수요 증가');
  expect(toggleLine('내가 쓴 이유', 'AI 수요 증가')).toBe('내가 쓴 이유\nAI 수요 증가');
});

it('removes on second toggle, preserves others', () => {
  const once = toggleLine('내가 쓴 이유', 'AI 수요 증가');
  expect(toggleLine(once, 'AI 수요 증가')).toBe('내가 쓴 이유');
});
