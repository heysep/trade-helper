import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export function getSupabaseConfig(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('SUPABASE env missing: set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  return { url, anonKey };
}

const cfg = (() => { try { return getSupabaseConfig(); } catch { return null; } })();
// SSR(웹 정적 렌더) 가드: Node에는 window/AsyncStorage 없음 — 클라이언트는 브라우저/네이티브 런타임에서만 생성
const isRuntime = typeof window !== 'undefined';
export const supabase = cfg && isRuntime
  ? createClient(cfg.url, cfg.anonKey, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : (null as unknown as ReturnType<typeof createClient>);
