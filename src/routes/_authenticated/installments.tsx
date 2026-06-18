import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { fmtEGP, fmtDate } from "@/lib/format";
import { Plus, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/installments")({ component: InstallmentsPage });

function InstallmentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["installment-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("installment_plans")
        .select("*, customers(full_name, phone), agents(full_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["installment-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("installment_payments")
        .select("*, installment_plans(customer_id, customers(full_name, phone))")
        .order("due_date").limit(50);
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = payments.filter((p) => p.status !== "paid").slice(0, 20);

  const markPaid = async (paymentId: string, amount: number, planId: string) => {
    const { error } = await supabase.from("installment_payments").update({
      amount_paid: amount, paid_at: new Date().toISOString(), status: "paid",
    }).eq("id", paymentId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["installment-payments"] });
    toast.success("تم تسجيل السداد");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">إدارة خطط التقسيط والأقساط المستحقة</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" /> خطة جديدة</Button></DialogTrigger>
          <PlanDialog onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["installment-plans"] }); qc.invalidateQueries({ queryKey: ["installment-payments"] }); }} />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold mb-3">الأقساط المستحقة</h2>
          <div className="space-y-2">
            {upcoming.map((p) => {
              const overdue = p.due_date < today && p.status !== "paid";
              const customer = (p.installment_plans as { customers: { full_name: string; phone: string } | null } | null)?.customers;
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${overdue ? "border-destructive bg-destructive/5" : "bg-muted"}`}>
                  <div className="flex-1">
                    <div className="font-semibold">{customer?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">استحقاق: {fmtDate(p.due_date)}</div>
                  </div>
                  <div className="text-left tabular-nums">
                    <div className="font-bold">{fmtEGP(p.amount_due)}</div>
                    {overdue && <Badge variant="destructive" className="text-xs">متأخر</Badge>}
                  </div>
                  <Button size="sm" onClick={() => markPaid(p.id, Number(p.amount_due), p.plan_id)}>
                    <CheckCircle2 className="h-4 w-4 ml-1" /> تحصيل
                  </Button>
                </div>
              );
            })}
            {upcoming.length === 0 && <div className="text-center text-muted-foreground py-6">لا توجد أقساط مستحقة</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold mb-3">خطط التقسيط ({plans.length})</h2>
          <div className="space-y-2">
            {plans.map((pl) => {
              const customer = (pl.customers as { full_name: string; phone: string } | null);
              const agent = (pl.agents as { full_name: string } | null);
              return (
                <div key={pl.id} className="flex justify-between items-center p-3 rounded bg-muted text-sm">
                  <div>
                    <div className="font-semibold">{customer?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {pl.installment_count} قسط × {fmtEGP(pl.installment_amount)} • مندوب: {agent?.full_name ?? "—"}
                    </div>
                  </div>
                  <div className="tabular-nums font-bold">{fmtEGP(pl.total_amount)}</div>
                </div>
              );
            })}
            {plans.length === 0 && <div className="text-center text-muted-foreground py-6">لا توجد خطط</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlanDialog({ onClose }: { onClose: () => void }) {
  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [total, setTotal] = useState("");
  const [down, setDown] = useState("0");
  const [count, setCount] = useState("12");
  const [freq, setFreq] = useState("30");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => (await supabase.from("customers").select("id, full_name, phone")).data ?? [],
  });
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-select"],
    queryFn: async () => (await supabase.from("agents").select("id, full_name").eq("is_active", true)).data ?? [],
  });

  const save = async () => {
    if (!customerId || !total || !count) return toast.error("أكمل البيانات");
    setSaving(true);
    const totalAmt = Number(total);
    const downAmt = Number(down);
    const cnt = Number(count);
    const freqDays = Number(freq);
    const installmentAmt = Math.ceil((totalAmt - downAmt) / cnt);

    const { data: plan, error } = await supabase.from("installment_plans").insert({
      customer_id: customerId, agent_id: agentId || null,
      total_amount: totalAmt, down_payment: downAmt,
      installment_count: cnt, installment_amount: installmentAmt,
      start_date: start, frequency_days: freqDays,
    }).select("id").single();

    if (error || !plan) { setSaving(false); return toast.error(error?.message ?? "خطأ"); }

    // generate installments
    const startDate = new Date(start);
    const installments = Array.from({ length: cnt }).map((_, i) => {
      const due = new Date(startDate);
      due.setDate(due.getDate() + freqDays * (i + 1));
      return {
        plan_id: plan.id, agent_id: agentId || null,
        due_date: due.toISOString().slice(0, 10),
        amount_due: installmentAmt,
      };
    });
    await supabase.from("installment_payments").insert(installments);

    setSaving(false);
    toast.success("تم إنشاء خطة التقسيط");
    onClose();
  };

  return (
    <DialogContent dir="rtl" className="max-w-lg">
      <DialogHeader><DialogTitle>خطة تقسيط جديدة</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>العميل</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>المندوب</Label>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger><SelectValue placeholder="بدون مندوب" /></SelectTrigger>
            <SelectContent>
              {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>المبلغ الإجمالي</Label><Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
          <div><Label>المقدم</Label><Input type="number" value={down} onChange={(e) => setDown(e.target.value)} /></div>
          <div><Label>عدد الأقساط</Label><Input type="number" value={count} onChange={(e) => setCount(e.target.value)} /></div>
          <div><Label>كل (يوم)</Label><Input type="number" value={freq} onChange={(e) => setFreq(e.target.value)} /></div>
        </div>
        <div><Label>تاريخ البدء</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving ? "..." : "إنشاء"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
