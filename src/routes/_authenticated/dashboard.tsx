import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtEGP, fmtNum } from "@/lib/format";
import { Wallet, ShoppingCart, Coins, Package, TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [wallets, salesToday, txToday, lowStock, totalCustomers] = await Promise.all([
        supabase.from("wallets").select("balance, is_blocked"),
        supabase.from("sales").select("total, profit").gte("created_at", today + "T00:00:00"),
        supabase.from("wallet_transactions").select("tx_type, amount").gte("created_at", today + "T00:00:00"),
        supabase.from("products").select("id, name, quantity, low_stock_threshold").lt("quantity", 5),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);

      const totalBalance = (wallets.data ?? []).reduce((s, w) => s + Number(w.balance), 0);
      const blockedCount = (wallets.data ?? []).filter((w) => w.is_blocked).length;
      const todaySalesTotal = (salesToday.data ?? []).reduce((s, x) => s + Number(x.total), 0);
      const todayProfit = (salesToday.data ?? []).reduce((s, x) => s + Number(x.profit), 0);
      const todayWithdraw = (txToday.data ?? []).filter((t) => t.tx_type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);
      const todayTransfer = (txToday.data ?? []).filter((t) => t.tx_type === "transfer").reduce((s, t) => s + Number(t.amount), 0);

      return {
        totalBalance, blockedCount,
        todaySalesTotal, todayProfit, todayWithdraw, todayTransfer,
        salesCount: salesToday.data?.length ?? 0,
        lowStock: lowStock.data ?? [],
        customers: totalCustomers.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "إجمالي رصيد المحافظ", value: fmtEGP(data?.totalBalance), icon: Wallet, color: "bg-primary text-primary-foreground" },
    { label: "مبيعات اليوم", value: fmtEGP(data?.todaySalesTotal), sub: `${fmtNum(data?.salesCount)} فاتورة`, icon: ShoppingCart, color: "bg-success text-success-foreground" },
    { label: "ربح اليوم", value: fmtEGP(data?.todayProfit), icon: TrendingUp, color: "gradient-gold text-primary" },
    { label: "سحوبات اليوم", value: fmtEGP(data?.todayWithdraw), icon: Coins, color: "bg-warning text-warning-foreground" },
    { label: "تحويلات اليوم", value: fmtEGP(data?.todayTransfer), icon: Coins, color: "bg-accent text-accent-foreground" },
    { label: "العملاء", value: fmtNum(data?.customers), icon: Package, color: "bg-secondary text-secondary-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && data.lowStock.length > 0 && (
        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تنبيهات نفاد المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.lowStock.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-2 rounded-md bg-muted">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-destructive">متبقي {fmtNum(p.quantity)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data && data.blockedCount > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>يوجد {fmtNum(data.blockedCount)} محفظة محظورة (وصلت لحد التحويل)</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
