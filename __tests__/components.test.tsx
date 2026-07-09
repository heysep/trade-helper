import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { StatusBadge, STATUS_LABEL } from '../src/components/StatusBadge';
import { TextField } from '../src/components/TextField';

describe('PrimaryButton', () => {
  it('fires onPress, not when disabled', () => {
    const fn = jest.fn();
    const { getByText, rerender } = render(<PrimaryButton title="확인" onPress={fn} />);
    fireEvent.press(getByText('확인'));
    expect(fn).toHaveBeenCalledTimes(1);
    rerender(<PrimaryButton title="확인" onPress={fn} disabled />);
    fireEvent.press(getByText('확인'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('StatusBadge', () => {
  it('maps status to Korean label', () => {
    expect(STATUS_LABEL.hold).toBe('유지');
    expect(STATUS_LABEL.exit).toBe('청산');
    const { getByText } = render(<StatusBadge status="watch" />);
    expect(getByText('관찰')).toBeTruthy();
  });
});

describe('TextField', () => {
  it('propagates text changes', () => {
    const fn = jest.fn();
    const { getByPlaceholderText } = render(<TextField label="가설" value="" onChangeText={fn} placeholder="입력" />);
    fireEvent.changeText(getByPlaceholderText('입력'), 'abc');
    expect(fn).toHaveBeenCalledWith('abc');
  });
});
