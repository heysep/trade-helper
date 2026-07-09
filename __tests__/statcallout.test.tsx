import { render } from '@testing-library/react-native';
import { StatCallout } from '../src/components/StatCallout';

it('renders label and value', () => {
  const { getByText } = render(<StatCallout label="전체 가설" value="24" />);
  expect(getByText('전체 가설')).toBeTruthy();
  expect(getByText('24')).toBeTruthy();
});
