import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface MarketEvent {
  id: string; event_date: string; label: string;
  region: 'US' | 'CN' | 'KR' | 'EU' | 'JP' | 'global';
  importance: 'high' | 'normal';
}

export function useMarketEvents() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['market_events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_events').select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MarketEvent[];
    },
  });
}
