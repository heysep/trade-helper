import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'calendar_star_overrides';

/** 캘린더 별표 수동 토글 — 기본값(실적/중요도) 위에 사용자 오버라이드를 얹음 */
export function useStars() {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v) setOverrides(JSON.parse(v)); });
  }, []);

  const isStarred = useCallback(
    (id: string, def: boolean) => overrides[id] ?? def,
    [overrides],
  );

  const toggleStar = useCallback((id: string, def: boolean) => {
    setOverrides((prev) => {
      const current = prev[id] ?? def;
      const next = { ...prev, [id]: !current };
      if (next[id] === def) delete next[id]; // 기본값과 같아지면 오버라이드 제거
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { isStarred, toggleStar };
}
