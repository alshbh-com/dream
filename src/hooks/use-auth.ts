import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "owner" | "admin" | "supervisor" | "cashier" | "accountant" | "agent" | "branch_manager";

export interface AuthState {
  user: User | null;
  roles: AppRole[];
  gateways: string[];
  loading: boolean;
}

export function useAuth(): AuthState & {
  hasRole: (r: AppRole) => boolean;
  isAdmin: boolean;
  canAccess: (gateway: string) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [gateways, setGateways] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async (uid: string) => {
    const [{ data: rs }, { data: gs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.rpc("user_gateways", { _uid: uid }),
    ]);
    setRoles((rs ?? []).map((r) => r.role as AppRole));
    setGateways(((gs ?? []) as Array<string | { user_gateways: string }>).map((g) =>
      typeof g === "string" ? g : g.user_gateways
    ));
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      if (data.user) loadAll(data.user.id).finally(() => mounted && setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadAll(session.user.id);
      else {
        setRoles([]);
        setGateways([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("owner") || roles.includes("admin");

  return {
    user,
    roles,
    gateways,
    loading,
    hasRole: (r) => roles.includes(r),
    isAdmin,
    canAccess: (g) => isAdmin || gateways.includes(g),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      if (user) await loadAll(user.id);
    },
  };
}
