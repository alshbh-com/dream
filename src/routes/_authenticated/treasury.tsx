import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { fmtEGP, fmtDate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { Lock, Unlock, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/treasury")({
  component: TreasuryPage,
});

function TreasuryPage() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data: days = [] } = useQuery({
    queryKey: ["treasury-days"],
    queryFn: async () => {
      const { data } = await supabase.from("treasury_days")
        .select("*").order("day_date", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const todayRow = days.find((d) => d.day_date === today);

  const computeToday = async () => {
    const startISO = today + "T00:00:00";
    const endISO = today + "T23:59:59";

    const [salesRes, txRes, expRes] = await Promise.all([
      supabase.from("sales").select("total, profit").gte("created_at", startISO).lte("created_at", endISO),
      supabase.from("wallet_transactions").select("tx_type, amount, commission").gte("created_at", startISO).lte("created_at", endISO),
      supabase.from("expenses").select("amount").eq("expense_date", today),
    ]);

    const totalSales = (salesRes.data ?? []).reduce((s, x) => s + Number(x.total), 0);
    const totalProfit = (salesRes.data ?? []).reduce((s, x) => s + Number(x.profit), 0);
    const totalWithdrawals = (txRes.data ?? []).filter((t) => t.tx_type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);
    const totalTransfers = (txRes.data ?? []).filter((t) => t.tx_type === "transfer").reduce((s, t) => s + Number(t.amount), 0);
    const totalDeposits = (txRes.data ?? []).filter((t) => t.tx_type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
    const totalCommissions = (txRes.data ?? []).reduce((s, t) => s + Number(t.commission), 0);
    const totalExpenses = (expRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0);

    // opening = previous day closing or 0
    const prev = days.find((d) => d.day_date < today);
    const opening = prev?.closing_balance ?? 0;
    const closing = Number(opening) + totalSales + totalDeposits + totalCommissions - totalWithdrawals - totalTransfers - totalExpenses;

    return {
      opening_balance: opening, total_sales: totalSales, total_profit: totalProfit,
      total_withdrawals: totalWithdrawals, total_transfers: totalTransfers,
      total_deposits: totalDeposits, total_commissions: totalCommissions,
      total_expenses: totalExpenses, closing_balance: closing,
    };
  };

  const refreshToday = async () => {
    const computed = await computeToday();
    if (todayRow) {
      if (todayRow.is_closed) return toast.error("اليوم مقفل ولا يمكن التعديل");
      await supabase.from("treasury_days").update(computed).eq("id", todayRow.id);
    } else {
      await supabase.from("treasury_days").insert({ day_date: today, ...computed });
    }
    qc.invalidateQueries({ queryKey: ["treasury-days"] });
    toast.success("تم تحديث بيانات اليوم");
  };

  const closeDay = async () => {
    if (!todayRow) { await refreshToday(); }
    const computed = await computeToday();
    const row = todayRow ?? (await supabase.from("treasury_days").select("*").eq("day_date", today).single()).data;
    if (!row) return toast.error("تعذّر إنشاء يوم اليوم");
    const { error } = await supabase.from("treasury_days").update({
      ...computed, is_closed: true, closed_at: new Date().toISOString(), closed_by: user?.id,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["treasury-days"] });
    toast.success("تم إقفال اليوم");
  };

  return (
    <div className="space-y-4">
      <Card className="gradient-emerald text-primary-foreground border-0">
        <CardHeader>
          <CardTitle className="flex justify-between items-center text-primary-foreground">
            <span>يوم {fmtDate(today)}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={refreshToday} disabled={todayRow?.is_closed}>
                <RefreshCcw className="h-4 w-4 ml-1" /> تحديث
              </Button>
              {isAdmin && !todayRow?.is_closed && (
                <Button size="sm" className="bg-gold text-primary hover:bg-gold/90" onClick={closeDay}>
                  <Lock className="h-4 w-4 ml-1" /> إقفال اليوم
                </Button>
              )}
              {todayRow?.is_closed && <Badge className="bg-destructive">مقفل</Badge>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayRow ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="رصيد افتتاحي" value={todayRow.opening_balance} />
              <Stat label="مبيعات" value={todayRow.total_sales} />
              <Stat label="إيداعات" value={todayRow.total_deposits} />
              <Stat label="عمولات" value={todayRow.total_commissions} />
              <Stat label="سحوبات" value={todayRow.total_withdrawals} negative />
              <Stat label="تحويلات" value={todayRow.total_transfers} negative />
              <Stat label="مصروفات" value={todayRow.total_expenses} negative />
              <Stat label="ربح" value={todayRow.total_profit} highlight />
              <div className="col-span-2 md:col-span-4 border-t border-primary-foreground/20 pt-3 mt-2">
                <div className="text-sm opacity-80">الرصيد الختامي</div>
                <div className="text-3xl font-bold tabular-nums">{fmtEGP(todayRow.closing_balance)}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="mb-3 opacity-90">لم يتم إنشاء يوم اليوم بعد</p>
              <Button onClick={refreshToday} variant="secondary"><RefreshCcw className="h-4 w-4 ml-1" /> إنشاء يوم اليوم</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>سجل الأيام السابقة</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-muted-foreground border-b">
                <tr>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">افتتاحي</th>
                  <th className="p-2">مبيعات</th>
                  <th className="p-2">مصروفات</th>
                  <th className="p-2">ربح</th>
                  <th className="p-2">ختامي</th>
                  <th className="p-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="p-2">{fmtDate(d.day_date)}</td>
                    <td className="p-2 tabular-nums">{fmtEGP(d.opening_balance)}</td>
                    <td className="p-2 tabular-nums">{fmtEGP(d.total_sales)}</td>
                    <td className="p-2 tabular-nums">{fmtEGP(d.total_expenses)}</td>
                    <td className="p-2 tabular-nums text-success">{fmtEGP(d.total_profit)}</td>
                    <td className="p-2 tabular-nums font-bold">{fmtEGP(d.closing_balance)}</td>
                    <td className="p-2">
                      {d.is_closed ? (
                        <Badge variant="secondary"><Lock className="h-3 w-3 ml-1" /> مقفل</Badge>
                      ) : (
                        <Badge><Unlock className="h-3 w-3 ml-1" /> مفتوح</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {days.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد سجلات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, negative, highlight }: { label: string; value: number; negative?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs opacity-80">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${highlight ? "text-gold" : ""}`}>
        {negative ? "−" : ""}{fmtEGP(value)}
      </div>
    </div>
  );
}
