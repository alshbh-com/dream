import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { fmtEGP, fmtNum } from "@/lib/format";
import { Plus, Smartphone, Package as PackageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

type Product = {
  id: string; name: string; brand: string | null; model: string | null;
  color: string | null; storage_size: string | null; barcode: string | null;
  purchase_price: number; selling_price: number; quantity: number;
  low_stock_threshold: number; supplier: string | null; is_phone: boolean; is_active: boolean;
};

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [openImei, setOpenImei] = useState<Product | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return (data ?? []) as Product[];
    },
  });

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search) || p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="بحث بالاسم، الماركة، الباركود..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-48" />
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-1" /> منتج جديد</Button>
          </DialogTrigger>
          <ProductDialog onClose={() => { setOpenNew(false); qc.invalidateQueries({ queryKey: ["products"] }); }} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className={p.quantity <= p.low_stock_threshold ? "border-warning" : ""}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {p.is_phone ? <Smartphone className="h-5 w-5 text-primary" /> : <PackageIcon className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <h3 className="font-bold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {[p.brand, p.model, p.color, p.storage_size].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
                {p.quantity <= p.low_stock_threshold && <Badge variant="destructive">منخفض</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">شراء</div>
                  <div className="font-semibold tabular-nums">{fmtEGP(p.purchase_price)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">بيع</div>
                  <div className="font-semibold tabular-nums text-success">{fmtEGP(p.selling_price)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">الكمية</div>
                  <div className="font-semibold tabular-nums">{fmtNum(p.quantity)}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditProduct(p)}>تعديل</Button>
                {p.is_phone && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpenImei(p)}>IMEI</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">لا توجد منتجات</CardContent></Card>
        )}
      </div>

      {editProduct && (
        <Dialog open onOpenChange={() => setEditProduct(null)}>
          <ProductDialog product={editProduct} onClose={() => { setEditProduct(null); qc.invalidateQueries({ queryKey: ["products"] }); }} />
        </Dialog>
      )}
      {openImei && <ImeiDialog product={openImei} onClose={() => setOpenImei(null)} />}
    </div>
  );
}

function ProductDialog({ product, onClose }: { product?: Product; onClose: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [model, setModel] = useState(product?.model ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [storage, setStorage] = useState(product?.storage_size ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [purchase, setPurchase] = useState(String(product?.purchase_price ?? "0"));
  const [selling, setSelling] = useState(String(product?.selling_price ?? "0"));
  const [qty, setQty] = useState(String(product?.quantity ?? "0"));
  const [low, setLow] = useState(String(product?.low_stock_threshold ?? "2"));
  const [supplier, setSupplier] = useState(product?.supplier ?? "");
  const [isPhone, setIsPhone] = useState(product?.is_phone ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = {
      name, brand: brand || null, model: model || null, color: color || null,
      storage_size: storage || null, barcode: barcode || null,
      purchase_price: Number(purchase), selling_price: Number(selling),
      quantity: Number(qty), low_stock_threshold: Number(low),
      supplier: supplier || null, is_phone: isPhone,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(product ? "تم التعديل" : "تمت الإضافة");
    onClose();
  };

  return (
    <DialogContent dir="rtl" className="max-w-xl">
      <DialogHeader><DialogTitle>{product ? "تعديل المنتج" : "منتج جديد"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>الماركة</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
        <div><Label>الموديل</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
        <div><Label>اللون</Label><Input value={color} onChange={(e) => setColor(e.target.value)} /></div>
        <div><Label>المساحة</Label><Input value={storage} onChange={(e) => setStorage(e.target.value)} /></div>
        <div><Label>الباركود</Label><Input value={barcode} onChange={(e) => setBarcode(e.target.value)} /></div>
        <div><Label>المورد</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
        <div><Label>سعر الشراء</Label><Input type="number" value={purchase} onChange={(e) => setPurchase(e.target.value)} /></div>
        <div><Label>سعر البيع</Label><Input type="number" value={selling} onChange={(e) => setSelling(e.target.value)} /></div>
        <div><Label>الكمية</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        <div><Label>حد التنبيه</Label><Input type="number" value={low} onChange={(e) => setLow(e.target.value)} /></div>
        <div className="col-span-2 flex items-center gap-2">
          <Switch checked={isPhone} onCheckedChange={setIsPhone} id="phone" />
          <Label htmlFor="phone">هذا المنتج موبايل (يتطلب IMEI)</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={save} disabled={saving || !name}>{saving ? "..." : "حفظ"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ImeiDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");

  const { data: imeis = [] } = useQuery({
    queryKey: ["imeis", product.id],
    queryFn: async () => {
      const { data } = await supabase.from("product_imeis").select("*").eq("product_id", product.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addImei = async () => {
    if (!imei) return;
    const { error } = await supabase.from("product_imeis").insert({
      product_id: product.id, imei, serial_number: serial || null,
      purchase_price: product.purchase_price,
    });
    if (error) return toast.error(error.message);
    setImei(""); setSerial("");
    qc.invalidateQueries({ queryKey: ["imeis", product.id] });
    toast.success("تمت إضافة IMEI");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>IMEI — {product.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="IMEI" value={imei} onChange={(e) => setImei(e.target.value)} />
          <Input placeholder="Serial (اختياري)" value={serial} onChange={(e) => setSerial(e.target.value)} />
        </div>
        <Button onClick={addImei}>إضافة IMEI</Button>
        <div className="max-h-72 overflow-auto space-y-1">
          {imeis.map((i) => (
            <div key={i.id} className="flex justify-between items-center p-2 rounded bg-muted">
              <div>
                <div className="font-mono text-sm">{i.imei}</div>
                {i.serial_number && <div className="text-xs text-muted-foreground">{i.serial_number}</div>}
              </div>
              <Badge variant={i.status === "available" ? "default" : i.status === "sold" ? "secondary" : "outline"}>
                {i.status === "available" ? "متاح" : i.status === "sold" ? "مباع" : i.status === "returned" ? "مرتجع" : "تالف"}
              </Badge>
            </div>
          ))}
          {imeis.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">لا توجد أرقام IMEI</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
