import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Wallet, Coins, ShoppingCart, Package,
  Users, UserCog, CalendarClock, LogOut, Menu, Smartphone, Receipt,
} from "lucide-react";
import { useState } from "react";
import { roleLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string; adminOnly?: boolean };
const navItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "الرئيسية" },
  { to: "/pos", icon: ShoppingCart, label: "نقاط البيع" },
  { to: "/wallets", icon: Wallet, label: "المحافظ" },
  { to: "/treasury", icon: Coins, label: "الخزينة اليومية" },
  { to: "/inventory", icon: Package, label: "المخزون" },
  { to: "/customers", icon: Users, label: "العملاء" },
  { to: "/installments", icon: CalendarClock, label: "الأقساط" },
  { to: "/agents", icon: UserCog, label: "المندوبون" },
  { to: "/expenses", icon: Receipt, label: "المصروفات" },
  { to: "/users", icon: Smartphone, label: "المستخدمون", adminOnly: true },
];

function AuthLayout() {
  const { user, roles, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-gold flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-bold leading-tight">Dream Phone</div>
            <div className="text-xs text-sidebar-foreground/60">نظام ERP</div>
          </div>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem-5rem)]">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to as "/dashboard"}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/90"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-sidebar-border bg-sidebar">
          <div className="text-xs text-sidebar-foreground/70 mb-2 px-2 truncate">{user?.email}</div>
          <div className="text-xs text-gold mb-2 px-2">
            {roles.map(roleLabel).join("، ") || "بدون دور"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل خروج
          </Button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center px-4 lg:px-6 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold mr-2">
            {navItems.find((i) => i.to === pathname)?.label ?? "Dream Phone"}
          </h1>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
