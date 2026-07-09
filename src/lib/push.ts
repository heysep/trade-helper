import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice || !supabase) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userData.user.id);
  } catch {
    // 푸시는 선택 기능 — 실패해도 앱 동작에 영향 없음
  }
}
