import { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors, type, radius, space } from '@/theme';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}
interface DialogSpec { title: string; message?: string; buttons?: DialogButton[] }

const Ctx = createContext<{ show: (spec: DialogSpec) => void }>({ show: () => {} });
export const useDialog = () => useContext(Ctx);

/** Alert.alert 대체 — react-native-web에서 Alert가 no-op이라 웹·네이티브 공통 모달 사용 */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [spec, setSpec] = useState<DialogSpec | null>(null);
  const show = useCallback((s: DialogSpec) => setSpec(s), []);
  const close = () => setSpec(null);
  const buttons = spec?.buttons?.length ? spec.buttons : [{ text: '확인' }];

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Modal visible={!!spec} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: colors.surfaceElevatedDark, borderRadius: radius.xl, padding: space.lg }}>
            <Text style={[type.titleMd, { color: colors.onDark, marginBottom: spec?.message ? space.xs : space.lg }]}>{spec?.title}</Text>
            {spec?.message ? (
              <Text style={[type.bodyMd, { color: colors.body, marginBottom: space.lg }]}>{spec.message}</Text>
            ) : null}
            {buttons.map((b, i) => {
              const color = b.style === 'destructive' ? colors.tradingDown : b.style === 'cancel' ? colors.muted : colors.primary;
              return (
                <Pressable key={i}
                  onPress={() => { close(); b.onPress?.(); }}
                  style={({ pressed }) => [{
                    height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: i === 0 ? 0 : 8,
                    backgroundColor: pressed ? colors.surfaceCardDark : b.style === 'cancel' ? 'transparent' : colors.surfaceCardDark,
                    borderWidth: b.style === 'cancel' ? 0 : 1,
                    borderColor: b.style === 'destructive' ? colors.tradingDown + '66' : colors.hairlineOnDark,
                  }]}
                >
                  <Text style={[type.button, { color }]}>{b.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}
