import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtDateTime, roleLabel } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

type Profile = { id: string; full_name: string; phone: string | null; username: string | null; is_active: boolean; created_at: string };

function UsersPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data as Profile[] ?? [],
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  if (!isAdmin) {
    return (
      <Card><CardContent className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p>هذه الصفحة للأدمن فقط</p>
      </CardContent></Card>
    );
  }

  type AppRoleDB = "owner" | "admin" | "cashier" | "accountant" | "agent" | "branch_manager";
  const assignRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: role as AppRoleDB }, { onConflict: "user_id,role" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["all-roles"] });
    toast.success("تم إضافة الدور");
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["all-roles"] });
    toast.success("تم حذف الدور");
  };

  const toggleActive = async (p: Profile) => {
    const { error } = await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profiles"] });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">إدارة المستخدمين والصلاحيات. أول حساب يُسجل يصبح المالك تلقائياً.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {profiles.map((p) => {
          const userRoles = roles.filter((r) => r.user_id === p.id).map((r) => r.role);
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{p.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{p.username} • {p.phone}</p>
                    <p className="text-xs text-muted-foreground">انضم: {fmtDateTime(p.created_at)}</p>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "نشط" : "موقوف"}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">الأدوار:</div>
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map((r) => (
                      <Badge key={r} variant="outline" className="cursor-pointer" onClick={() => removeRole(p.id, r)}>
                        {roleLabel(r)} ×
                      </Badge>
                    ))}
                    {userRoles.length === 0 && <span className="text-xs text-muted-foreground">بدون دور</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={(v) => assignRole(p.id, v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="إضافة دور" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">مالك</SelectItem>
                      <SelectItem value="admin">أدمن</SelectItem>
                      <SelectItem value="cashier">كاشير</SelectItem>
                      <SelectItem value="accountant">محاسب</SelectItem>
                      <SelectItem value="agent">مندوب</SelectItem>
                      <SelectItem value="branch_manager">مدير فرع</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                    {p.is_active ? "إيقاف" : "تفعيل"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
