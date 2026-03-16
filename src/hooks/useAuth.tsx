import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'barber' | 'client' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'barber' | 'client', phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const fetchRole = async (userId: string, fallbackRole?: UserRole): Promise<UserRole> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar papel do usuário:', error);
      const resolvedFallback = fallbackRole ?? null;
      setRole(resolvedFallback);
      return resolvedFallback;
    }

    const resolvedRole = (data?.role as UserRole) ?? fallbackRole ?? null;

    if (!data?.role && fallbackRole) {
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: fallbackRole });

      if (insertError) {
        console.error('Erro ao recuperar papel do usuário:', insertError);
      }
    }

    setRole(resolvedRole);
    return resolvedRole;
  };

  const hydrateAuthState = async (currentSession: Session | null) => {
    setSession(currentSession);

    if (!currentSession?.user) {
      clearAuthState();
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.getUser();
    const serverUser = data.user;

    if (error || !serverUser) {
      console.error('Sessão inválida, limpando autenticação:', error);
      await supabase.auth.signOut();
      clearAuthState();
      setLoading(false);
      return;
    }

    setUser(serverUser);

    const resolvedRole = await fetchRole(
      serverUser.id,
      (serverUser.user_metadata?.role as UserRole) ?? null,
    );

    if (!resolvedRole) {
      console.error('Usuário sem papel válido, encerrando sessão');
      await supabase.auth.signOut();
      clearAuthState();
    }

    setLoading(false);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      await hydrateAuthState(currentSession);
    });

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      await hydrateAuthState(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, userRole: 'barber' | 'client', phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: userRole,
          phone: phone?.replace(/\D/g, '') || null,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role: userRole });
      if (phone) {
        await supabase.from('profiles').update({ phone: phone.replace(/\D/g, '') }).eq('user_id', data.user.id);
      }
      setRole(userRole);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
