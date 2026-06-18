import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { fmtEGP, providerLabel, txTypeLabel, fmtDateTime } from "@/lib/format";
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Ban, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/wallets")({
  component: WalletsPage,
});

type Wallet = {
  id: string; provider: string; phone_number: string; label: string | null;
  balance: number; daily_withdrawal_limit: number; daily_transfer_limit: number; daily_deposit_limit: number;
  used_withdrawal_today: number; used_transfer_today: number; used_deposit_today: number;
  is_blocked: boolean; limits_reset_date: string;
};

function WalletsPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: wallets = [] } = useQuery({
    queryKey: ["wallets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallets").select("*").order("created_at");
      if (error) throw error;
      return data as Wallet[];
    },
  });

  const [openNew, setOpenNew] = useState(false);
  const [openTx, setOpenTx] = useState<Wallet | null>(null);

  // --- Reset daily limits if needed (client-side guard) ---
  const ensureFreshLimits = async (w: Wallet) => {
    const today = new Date().toISOString().slice(0, 10);
    if (w.limits_reset_date !== today) {
      await supabase.from("wallets").update({
        used_withdrawal_today: 0, used_transfer_today: 0, used_deposit_today: 0,
        limits_reset_date: today, is_blocked: false,
      }).eq("id", w.id);
      qc.invalidateQueries({ queryKey: ["wallets"] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">إدارة محافظ كاش بحدود يومية لكل نوع عملية</p>
        {isAdmin && (
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-1" /> محفظة جديدة</Button>
            </DialogTrigger>
            <NewWalletDialog onClose={() => setOpenNew(false)} />
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {wallets.map((w) => (
          <WalletCard key={w.id} wallet={w} onTx={() => { ensureFreshLimits(w); setOpenTx(w); }} isAdmin={isAdmin} />
        ))}
        {wallets.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">لا توجد محافظ. أضف أول محفظة للبدء.</CardContent></Card>
        )}
      </div>

      {openTx && <TxDialog wallet={openTx} onClose={() => setOpenTx(null)} />}
    </div>
  );
}

function WalletCard({ wallet, onTx, isAdmin }: { wallet: Wallet; onTx: () => void; isAdmin: boolean }) {
  const qc = useQueryClient();
  const pct = (used: number, lim: number) => (lim > 0 ? Math.min(100, (used / lim) * 100) : 0);
  const wPct = pct(wallet.used_withdrawal_today, wallet.daily_withdrawal_limit);
  const tPct = pct(wallet.used_transfer_today, wallet.daily_transfer_limit);
  const dPct = pct(wallet.used_deposit_today, wallet.daily_deposit_limit);

  const toggleBlock = async () => {
    await supabase.from("wallets").update({ is_blocked: !wallet.is_blocked }).eq("id", wallet.id);
    qc.invalidateQueries({ queryKey: ["wallets"] });
    toast.success(wallet.is_blocked ? "تم فك الحظر" : "تم الحظر");
  };

  return (
    <Card className={wallet.is_blocked ? "border-destructive" : ""}>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{providerLabel(wallet.provider)}</h3>
              {wallet.is_blocked && <Badge variant="destructive">محظورة</Badge>}
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">{wallet.phone_number}</p>
            {wallet.label && <p className="text-xs text-muted-foreground">{wallet.label}</p>}
          </div>
          <div className="text-left">
            <div className="text-xs text-muted-foreground">الرصيد</div>
            <div className="text-xl font-bold text-primary tabular-nums">{fmtEGP(wallet.balance)}</div>
          </div>
        </div>

        <div className="space-y-2">
          <LimitBar label="سحب" used={wallet.used_withdrawal_today} limit={wallet.daily_withdrawal_limit} pct={wPct} />
          <LimitBar label="تحويل" used={wallet.used_transfer_today} limit={wallet.daily_transfer_limit} pct={tPct} />
          <LimitBar label="إيداع" used={wallet.used_deposit_today} limit={wallet.daily_deposit_limit} pct={dPct} />
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onTx} disabled={wallet.is_blocked}>
            <ArrowRightLeft className="h-4 w-4 ml-1" /> عملية جديدة
          </Button>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={toggleBlock}>
              {wallet.is_blocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LimitBar({ label, used, limit, pct }: { label: string; used: number; limit: number; pct: number }) {
  const color = pct >= 100 ? "bg-destructive" : pct >= 90 ? "bg-destructive/70" : pct >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{fmtEGP(used)} / {fmtEGP(limit)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NewWalletDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<string>("vodafone_cash");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [balance, setBalance] = useState("0");
  const [wLimit, setWLimit] = useState("60000");
  const [tLimit, setTLimit] = useState("60000");
  const [dLimit, setDLimit] = useState("60000");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("wallets").insert({
      provider: provider as "vodafone_cash" | "etisalat_cash" | "orange_cash" | "we_pay",
      phone_number: phone, label: label || null,
      balance: Number(balance),
      daily_withdrawal_limit: Number(wLimit),
      daily_transfer_limit: Number(tLimit),
      daily_deposit_limit: Number(dLimit),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت إضافة المحفظة");
    qc.invalidateQueries({ queryKey: ["wallets"] });
    onClose();
  };

  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>محفظة جديدة</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>الشركة</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
              <SelectItem value="etisalat_cash">اتصالات كاش</SelectItem>
              <SelectItem value="orange_cash">أورانج كاش</SelectItem>
              <SelectItem value="we_pay">وي باي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>رقم الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>وصف (اختياري)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        <div><Label>الرصيد الافتتاحي</Label><Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>حد سحب</Label><Input type="number" value={wLimit} onChange={(e) => setWLimit(e.target.value)} /></div>
          <div><Label>حد تحويل</Label><Input type="number" value={tLimit} onChange={(e) => setTLimit(e.target.value)} /></div>
          <div><Label>حد إيداع</Label><Input type="number" value={dLimit} onChange={(e) => setDLimit(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSave} disabled={saving}>{saving ? "..." : "حفظ"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TxDialog({ wallet, onClose }: { wallet: Wallet; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [type, setType] = useState<"withdrawal" | "transfer" | "deposit">("withdrawal");
  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("0");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["wallet-tx", wallet.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions")
        .select("*").eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const usedField = { withdrawal: "used_withdrawal_today", transfer: "used_transfer_today", deposit: "used_deposit_today" }[type];
  const limitField = { withdrawal: "daily_withdrawal_limit", transfer: "daily_transfer_limit", deposit: "daily_deposit_limit" }[type] as keyof Wallet;
  const used = wallet[usedField as keyof Wallet] as number;
  const limit = wallet[limitField] as number;
  const remaining = Math.max(0, limit - used);

  const onSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("أدخل مبلغ صحيح");
    if (amt > remaining) return toast.error(`المتبقي من الحد: ${fmtEGP(remaining)}`);

    setSaving(true);
    const { error: txErr } = await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      tx_type: type,
      amount: amt,
      commission: Number(commission || 0),
      notes: notes || null,
      customer_phone: customerPhone || null,
      created_by: user?.id,
      status: "approved",
    });
    if (txErr) { setSaving(false); return toast.error(txErr.message); }

    const newUsed = used + amt;
    const newBalance = type === "deposit" ? wallet.balance + amt : wallet.balance - amt;
    const shouldBlock = newUsed >= limit;
    const updates: Record<string, unknown> = {
      [usedField]: newUsed,
      balance: newBalance,
    };
    if (shouldBlock) updates.is_blocked = true;
    await supabase.from("wallets").update(updates).eq("id", wallet.id);

    setSaving(false);
    toast.success("تمت العملية بنجاح");
    if (newUsed / limit >= 0.8 && newUsed / limit < 1) toast.warning("تنبيه: تجاوزت 80% من الحد");
    qc.invalidateQueries({ queryKey: ["wallets"] });
    qc.invalidateQueries({ queryKey: ["wallet-tx", wallet.id] });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{providerLabel(wallet.provider)} — {wallet.phone_number}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {(["withdrawal", "transfer", "deposit"] as const).map((t) => (
            <Button key={t} variant={type === t ? "default" : "outline"} size="sm" onClick={() => setType(t)}>
              {t === "withdrawal" && <ArrowUpFromLine className="h-4 w-4 ml-1" />}
              {t === "transfer" && <ArrowRightLeft className="h-4 w-4 ml-1" />}
              {t === "deposit" && <ArrowDownToLine className="h-4 w-4 ml-1" />}
              {txTypeLabel(t)}
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground bg-muted rounded p-2 tabular-nums">
          المتبقي من حد {txTypeLabel(type)}: <span className="font-bold text-foreground">{fmtEGP(remaining)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>المبلغ</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>العمولة</Label><Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
          <div className="col-span-2"><Label>هاتف العميل (اختياري)</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
          <div className="col-span-2"><Label>ملاحظات</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        <div className="border-t pt-3">
          <div className="text-sm font-semibold mb-2">آخر العمليات</div>
          <div className="space-y-1 max-h-40 overflow-auto">
            {history.map((h) => (
              <div key={h.id} className="flex justify-between text-xs p-2 rounded bg-muted">
                <span>{txTypeLabel(h.tx_type)} — {fmtDateTime(h.created_at)}</span>
                <span className="tabular-nums font-semibold">{fmtEGP(h.amount)}</span>
              </div>
            ))}
            {history.length === 0 && <div className="text-xs text-muted-foreground text-center py-2">لا توجد عمليات</div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "..." : "تأكيد العملية"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
