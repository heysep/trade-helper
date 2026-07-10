import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignalsUnread } from '@/hooks/useSignals';
import { colors, type } from '@/theme';

export function AlertBell() {
  const router = useRouter();
  const { unreadCount } = useSignalsUnread();
  return (
    <Pressable onPress={() => router.push('/alerts')} style={{ paddingHorizontal: 16, paddingVertical: 4 }} hitSlop={8}>
      <View>
        <Ionicons name="notifications-outline" size={22} color={colors.onDark} />
        {unreadCount > 0 ? (
          <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
            <Text style={[type.caption, { color: colors.onPrimary, fontSize: 10, lineHeight: 12 }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
