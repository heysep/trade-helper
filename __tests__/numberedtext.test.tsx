import { render } from '@testing-library/react-native';
import { NumberedText, splitItems } from '../src/components/NumberedText';

describe('splitItems', () => {
  it('splits newlines and strips existing numbering', () => {
    expect(splitItems('1. 수요 증가\n2. 마진 개선')).toEqual(['수요 증가', '마진 개선']);
    expect(splitItems('수요 증가\n마진 개선')).toEqual(['수요 증가', '마진 개선']);
    expect(splitItems('한 줄짜리')).toEqual(['한 줄짜리']);
    expect(splitItems('a\n\n b ')).toEqual(['a', 'b']);
  });
});

it('renders numbered rows for multiline', () => {
  const { getByText } = render(<NumberedText text={'수요 증가\n마진 개선'} />);
  expect(getByText('1.')).toBeTruthy();
  expect(getByText('마진 개선')).toBeTruthy();
});

describe('edit-mode helpers', () => {
  const { toNumbered, fromNumbered, autoNumberOnEnter } = require('../src/components/NumberedText');
  it('toNumbered adds prefixes only for multiline', () => {
    expect(toNumbered('수요 증가\n마진 개선')).toBe('1. 수요 증가\n2. 마진 개선');
    expect(toNumbered('한 줄')).toBe('한 줄');
  });
  it('fromNumbered strips prefixes', () => {
    expect(fromNumbered('1. 수요 증가\n2. 마진 개선')).toBe('수요 증가\n마진 개선');
  });
  it('autoNumberOnEnter inserts next number on newline', () => {
    expect(autoNumberOnEnter('1. 수요 증가', '1. 수요 증가\n')).toBe('1. 수요 증가\n2. ');
    expect(autoNumberOnEnter('1. 수요', '1. 수')).toBe('1. 수'); // 삭제는 그대로
  });
  it('autoNumberOnEnter converts unnumbered first line', () => {
    expect(autoNumberOnEnter('클라우드 성장', '클라우드 성장\n')).toBe('1. 클라우드 성장\n2. ');
  });
});
