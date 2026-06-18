import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { fmtEGP } from "@/lib/format";
import { Plus, UserCog } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/agents")({ component: AgentsPage });

function AgentsPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").order("full_name");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">إدارة المندوبين والعمولات</p>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" /> مندوب جديد</Button></DialogTrigger>
            <AgentDialog onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["agents"] }); }} />
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{a.full_name}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums">{a.phone}</p>
                </div>
                <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "نشط" : "موقوف"}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">عمولة</div>
                  <div className="font-bold tabular-nums">{a.commission_rate}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">عهدة</div>
                  <div className="font-bold tabular-nums">{fmtEGP(a.custody_balance)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">محصّل</div>
                  <div className="font-bold tabular-nums text-success">{fmtEGP(a.collected_total)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {agents.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">لا يوجد مندوبون</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function AgentDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState("5");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("agents").insert({
      full_name: name, phone, commission_rate: Number(rate),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت الإضافة");
    onClose();
  };

  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>مندوب جديد</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>نسبة العمولة %</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !name || !phone}>{saving ? "..." : "حفظ"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
