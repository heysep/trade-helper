import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const Ctx = createContext<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
  useEffect(() => {
    if (!supabase) { setState({ userId: null, ready: true }); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        setState({ userId: error ? null : data.session?.user.id ?? null, ready: true });
      } else {
        setState({ userId: session.user.id, ready: true });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setState((prev) => ({ ...prev, userId: s?.user.id ?? null }));
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
