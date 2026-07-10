import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 주의: Expo는 `process.env.EXPO_PUBLIC_*` 를 "직접 표기한 위치"만 빌드타임에 인라인한다.
// process.env를 객체로 넘겨 동적으로 읽으면 릴리즈 빌드에서 빈 값이 된다.
const ENV_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ENV_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseConfig(env?: Record<string, string | undefined>) {
  const url = env ? env.EXPO_PUBLIC_SUPABASE_URL : ENV_URL;
  const anonKey = env ? env.EXPO_PUBLIC_SUPABASE_ANON_KEY : ENV_ANON_KEY;
  if (!url || !anonKey) throw new Error('SUPABASE env missing: set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  return { url, anonKey };
}

const cfg = (() => { try { return getSupabaseConfig(); } catch { return null; } })();
// SSR(웹 정적 렌더) 가드: Node에는 window/AsyncStorage 없음 — 클라이언트는 브라우저/네이티브 런타임에서만 생성
const isRuntime = typeof window !== 'undefined';
export const supabase = cfg && isRuntime
  ? createClient(cfg.url, cfg.anonKey, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : (null as unknown as ReturnType<typeof createClient>);
