jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { getSupabaseConfig } from '../src/lib/supabase';

it('throws clear error when env missing', () => {
  expect(() => getSupabaseConfig({})).toThrow('SUPABASE env missing');
});
it('reads env', () => {
  const cfg = getSupabaseConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' });
  expect(cfg.url).toBe('https://x.supabase.co');
});
