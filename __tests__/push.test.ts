jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn(),
}));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('../src/lib/supabase', () => ({ supabase: null }));
import { registerPushToken } from '../src/lib/push';

it('resolves without throwing on simulator/denied permission', async () => {
  await expect(registerPushToken()).resolves.toBeUndefined();
});
