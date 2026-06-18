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
import { fmtEGP } from "@/lib/format";
import { Plus, Trash2, ShoppingCart, Printer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/pos")({
  component: POSPage,
});

type Product = {
  id: string; name: string; selling_price: number; purchase_price: number;
  quantity: number; is_phone: boolean; barcode: string | null;
};
type CartItem = { product: Product; quantity: number; imei_id?: string };

function POSPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet" | "mixed">("cash");
  const [walletId, setWalletId] = useState<string>("");
  const [walletAmount, setWalletAmount] = useState("0");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<{ number: number; items: CartItem[]; total: number } | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products-pos"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, selling_price, purchase_price, quantity, is_phone, barcode")
        .gt("quantity", 0).eq("is_active", true);
      return (data ?? []) as Product[];
    },
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ["wallets-pos"],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("id, provider, phone_number, is_blocked").eq("is_blocked", false);
      return data ?? [];
    },
  });

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode === search
  );

  const subtotal = cart.reduce((s, c) => s + c.product.selling_price * c.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const profit = cart.reduce((s, c) => s + (c.product.selling_price - c.product.purchase_price) * c.quantity, 0) - Number(discount || 0);

  const addToCart = (p: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.product.id === p.id);
      if (existing) {
        if (existing.quantity >= p.quantity) { toast.error("الكمية المتاحة بلغت الحد"); return c; }
        return c.map((i) => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...c, { product: p, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => setCart((c) => c.filter((i) => i.product.id !== id));
  const updateQty = (id: string, q: number) => setCart((c) => c.map((i) => i.product.id === id ? { ...i, quantity: Math.max(1, q) } : i));

  const checkout = async () => {
    if (cart.length === 0) return toast.error("السلة فارغة");
    if (paymentMethod !== "cash" && !walletId) return toast.error("اختر محفظة");

    setSaving(true);

    // Find or create customer
    let customerId: string | null = null;
    if (customerPhone) {
      const { data: existing } = await supabase.from("customers").select("id").eq("phone", customerPhone).maybeSingle();
      if (existing) customerId = existing.id;
      else if (customerName) {
        const { data: newC } = await supabase.from("customers").insert({ full_name: customerName, phone: customerPhone }).select("id").single();
        customerId = newC?.id ?? null;
      }
    }

    const wAmt = paymentMethod === "wallet" ? total : paymentMethod === "mixed" ? Number(walletAmount) : 0;
    const cAmt = total - wAmt;

    const { data: sale, error: saleErr } = await supabase.from("sales").insert({
      customer_id: customerId,
      cashier_id: user?.id,
      subtotal, discount: Number(discount || 0), total, profit,
      payment_method: paymentMethod,
      wallet_id: walletId || null,
      cash_amount: cAmt, wallet_amount: wAmt,
    }).select("id, invoice_number").single();

    if (saleErr || !sale) { setSaving(false); return toast.error(saleErr?.message ?? "خطأ"); }

    // Insert items + decrement stock
    for (const item of cart) {
      await supabase.from("sale_items").insert({
        sale_id: sale.id, product_id: item.product.id,
        product_name: item.product.name, quantity: item.quantity,
        unit_price: item.product.selling_price, unit_cost: item.product.purchase_price,
        line_total: item.product.selling_price * item.quantity,
      });
      await supabase.from("products").update({ quantity: item.product.quantity - item.quantity }).eq("id", item.product.id);
    }

    // If wallet payment, update wallet balance and used_deposit
    if (walletId && wAmt > 0) {
      const wallet = wallets.find((w) => w.id === walletId);
      if (wallet) {
        const { data: full } = await supabase.from("wallets").select("balance, used_deposit_today").eq("id", walletId).single();
        if (full) {
          await supabase.from("wallets").update({
            balance: Number(full.balance) + wAmt,
            used_deposit_today: Number(full.used_deposit_today) + wAmt,
          }).eq("id", walletId);
        }
      }
    }

    setSaving(false);
    setLastInvoice({ number: sale.invoice_number, items: cart, total });
    setCart([]); setDiscount("0"); setWalletAmount("0"); setCustomerPhone(""); setCustomerName("");
    qc.invalidateQueries({ queryKey: ["products-pos"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    toast.success(`تم البيع — فاتورة #${sale.invoice_number}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Products list */}
      <div className="lg:col-span-2 space-y-3">
        <Input placeholder="بحث بالاسم أو الباركود..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[calc(100vh-16rem)] overflow-auto">
          {filtered.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => addToCart(p)}>
              <CardContent className="p-3">
                <div className="text-sm font-semibold line-clamp-2">{p.name}</div>
                <div className="text-lg font-bold text-primary tabular-nums mt-1">{fmtEGP(p.selling_price)}</div>
                <div className="text-xs text-muted-foreground">متاح: {p.quantity}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div>
        <Card className="sticky top-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-bold">السلة ({cart.length})</h2>
            </div>

            <div className="space-y-1 max-h-64 overflow-auto">
              {cart.map((c) => (
                <div key={c.product.id} className="flex items-center gap-2 p-2 rounded bg-muted text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{c.product.name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{fmtEGP(c.product.selling_price)} × </div>
                  </div>
                  <Input type="number" value={c.quantity} onChange={(e) => updateQty(c.product.id, Number(e.target.value))} className="w-14 h-7 text-center" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(c.product.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {cart.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">السلة فارغة</div>}
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="اسم العميل" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <Input placeholder="هاتف العميل" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">الخصم</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "wallet" | "mixed")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="wallet">محفظة</SelectItem>
                    <SelectItem value="mixed">مختلط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(paymentMethod === "wallet" || paymentMethod === "mixed") && (
                <>
                  <Select value={walletId} onValueChange={setWalletId}>
                    <SelectTrigger><SelectValue placeholder="اختر محفظة" /></SelectTrigger>
                    <SelectContent>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.provider} — {w.phone_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {paymentMethod === "mixed" && (
                    <div>
                      <Label className="text-xs">مبلغ المحفظة</Label>
                      <Input type="number" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} />
                    </div>
                  )}
                </>
              )}

              <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                <div className="flex justify-between text-sm"><span>المجموع</span><span className="tabular-nums">{fmtEGP(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span>الخصم</span><span className="tabular-nums">-{fmtEGP(Number(discount || 0))}</span></div>
                <div className="flex justify-between text-xl font-bold border-t border-primary-foreground/20 mt-1 pt-1">
                  <span>الإجمالي</span><span className="tabular-nums">{fmtEGP(total)}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={saving || cart.length === 0} onClick={checkout}>
                {saving ? "جاري الحفظ..." : "إتمام البيع"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {lastInvoice && (
        <Dialog open onOpenChange={() => setLastInvoice(null)}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>فاتورة #{lastInvoice.number}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {lastInvoice.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b pb-1">
                  <span>{i.product.name} × {i.quantity}</span>
                  <span className="tabular-nums">{fmtEGP(i.product.selling_price * i.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>الإجمالي</span>
                <span className="tabular-nums">{fmtEGP(lastInvoice.total)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => window.print()}><Printer className="h-4 w-4 ml-1" /> طباعة</Button>
              <Button variant="outline" onClick={() => setLastInvoice(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
