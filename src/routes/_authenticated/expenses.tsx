import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { fmtEGP, fmtDate } from "@/lib/format";
import { Plus, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const save = async () => {
    if (!category || !amount) return toast.error("أكمل البيانات");
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      category, amount: Number(amount), description: desc || null,
      expense_date: date, created_by: user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت الإضافة");
    setCategory(""); setAmount(""); setDesc(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["expenses"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm">إجمالي المصروفات: <span className="font-bold tabular-nums">{fmtEGP(total)}</span></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" /> مصروف جديد</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>مصروف جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>الفئة</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً: إيجار، فواتير، رواتب" /></div>
              <div><Label>المبلغ</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div><Label>الوصف</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <div><Label>التاريخ</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "..." : "حفظ"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-right border-b bg-muted">
              <tr>
                <th className="p-3">التاريخ</th><th className="p-3">الفئة</th><th className="p-3">الوصف</th><th className="p-3">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="p-3">{fmtDate(e.expense_date)}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />{e.category}</div></td>
                  <td className="p-3 text-muted-foreground">{e.description ?? "—"}</td>
                  <td className="p-3 tabular-nums font-semibold text-destructive">{fmtEGP(e.amount)}</td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد مصروفات</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
