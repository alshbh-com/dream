import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "owner" | "admin" | "cashier" | "accountant" | "agent" | "branch_manager";

export interface AuthState {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
}

export function useAuth(): AuthState & {
  hasRole: (r: AppRole) => boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRoles = async (uid: string) => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (mounted) setRoles((data ?? []).map((r) => r.role as AppRole));
    };

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      if (data.user) loadRoles(data.user.id).finally(() => mounted && setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadRoles(session.user.id);
      else setRoles([]);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    roles,
    loading,
    hasRole: (r) => roles.includes(r),
    isAdmin: roles.includes("owner") || roles.includes("admin"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
