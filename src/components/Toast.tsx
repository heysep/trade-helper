import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, radius, space } from '@/theme';

const Ctx = createContext<{ show: (msg: string) => void }>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const y = useRef(new Animated.Value(-80)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(y, { toValue: -80, duration: 200, useNativeDriver: true }).start(() => setMsg(null));
    }, 2500);
  }, [y]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg ? (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: insets.top + 6, left: space.md, right: space.md,
          transform: [{ translateY: y }], zIndex: 999,
        }}>
          <View style={{
            backgroundColor: colors.surfaceElevatedDark, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.tradingUp + '66',
            paddingVertical: 12, paddingHorizontal: space.md, alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
          }}>
            <Text style={[type.titleSm, { color: colors.onDark }]}>{msg}</Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}
