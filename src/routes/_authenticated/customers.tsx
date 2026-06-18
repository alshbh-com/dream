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
import { fmtEGP, fmtNum } from "@/lib/format";
import { Plus, Phone, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers")({ component: CustomersPage });

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = customers.filter((c) => !search || c.full_name.includes(search) || c.phone.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" /> عميل جديد</Button></DialogTrigger>
          <CustomerDialog onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["customers"] }); }} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold">{c.full_name}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gold">
                  <Award className="h-4 w-4" />
                  <span className="font-bold tabular-nums">{fmtNum(c.loyalty_points)}</span>
                </div>
              </div>
              {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
              {Number(c.total_debt) > 0 && (
                <div className="text-sm text-destructive tabular-nums">مديونية: {fmtEGP(c.total_debt)}</div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">لا يوجد عملاء</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function CustomerDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nid, setNid] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      full_name: name, phone, national_id: nid || null, address: address || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت الإضافة");
    onClose();
  };

  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>عميل جديد</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>الرقم القومي</Label><Input value={nid} onChange={(e) => setNid(e.target.value)} /></div>
        <div><Label>العنوان</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !name || !phone}>{saving ? "..." : "حفظ"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
