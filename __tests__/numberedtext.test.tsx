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
