import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, type } from '@/theme';

export function scoreColor(score: number): string {
  if (score >= 70) return colors.tradingUp;
  if (score >= 40) return colors.primary;
  return colors.tradingDown;
}

const SIZE = 120;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function ScoreRing({ score }: { score: number }) {
  const c = scoreColor(score);
  const progress = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surfaceElevatedDark} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c} strokeWidth={STROKE} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRC * progress} ${CIRC}`}
        />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={[type.numberDisplay, { color: c }]}>{score}</Text>
        <Text style={[type.caption, { color: colors.muted, marginLeft: 2 }]}>점</Text>
      </View>
    </View>
  );
}
