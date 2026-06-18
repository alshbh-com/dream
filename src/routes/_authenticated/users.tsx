import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ALL_GATEWAYS, ALL_ROLES, fmtDateTime, gatewayLabel, roleLabel } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert, UserPlus, Shield, Trash2 } from "lucide-react";
import { createUserAdmin, deleteUserAdmin } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

type Profile = { id: string; full_name: string; phone: string | null; username: string | null; is_active: boolean; created_at: string };
type AppRoleDB = "owner" | "admin" | "supervisor" | "cashier" | "accountant" | "agent" | "branch_manager";

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

  const { data: rolePerms = [] } = useQuery({
    queryKey: ["role-perms"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("role_permissions").select("role, gateway");
      return (data ?? []) as { role: string; gateway: string }[];
    },
  });

  if (!isAdmin) {
    return (
      <Card><CardContent className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p>هذه الصفحة للأدمن فقط</p>
      </CardContent></Card>
    );
  }

  const assignRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: role as AppRoleDB }, { onConflict: "user_id,role" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["all-roles"] });
    toast.success("تم إضافة الدور");
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as AppRoleDB);
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
    <Tabs defaultValue="list" className="space-y-3">
      <TabsList>
        <TabsTrigger value="list">المستخدمون</TabsTrigger>
        <TabsTrigger value="add"><UserPlus className="h-4 w-4 ml-1" /> إضافة مستخدم</TabsTrigger>
        <TabsTrigger value="perms"><Shield className="h-4 w-4 ml-1" /> صلاحيات الأدوار</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-3">
        <p className="text-sm text-muted-foreground">إدارة المستخدمين والصلاحيات.</p>
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
                        {ALL_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                      {p.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                    <DeleteUserButton userId={p.id} name={p.full_name} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="add">
        <AddUserForm />
      </TabsContent>

      <TabsContent value="perms">
        <PermissionsMatrix rolePerms={rolePerms} />
      </TabsContent>
    </Tabs>
  );
}

function AddUserForm() {
  const qc = useQueryClient();
  const create = useServerFn(createUserAdmin);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", username: "", password: "" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggleRole = (r: string) =>
    setSelectedRoles((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));

  const submit = async () => {
    if (!form.full_name || !form.email || form.password.length < 6) {
      return toast.error("الاسم والإيميل وكلمة سر (6+) مطلوبة");
    }
    setBusy(true);
    try {
      await create({
        data: {
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone || null,
          username: form.username || null,
          roles: selectedRoles,
        },
      });
      toast.success("تم إنشاء المستخدم");
      setForm({ full_name: "", email: "", phone: "", username: "", password: "" });
      setSelectedRoles([]);
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإنشاء");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>مستخدم جديد</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>الاسم الكامل *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>البريد الإلكتروني *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>اسم المستخدم</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>كلمة السر *</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        </div>
        <div>
          <Label className="mb-2 block">الأدوار (يمكن اختيار أكثر من دور — تتجمع البوابات)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-accent">
                <Checkbox checked={selectedRoles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                <span>{roleLabel(r)}</span>
              </label>
            ))}
          </div>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full">
          {busy ? "جارٍ الإنشاء..." : "إنشاء المستخدم"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PermissionsMatrix({ rolePerms }: { rolePerms: { role: string; gateway: string }[] }) {
  const qc = useQueryClient();
  const has = (role: string, gw: string) => rolePerms.some((p) => p.role === role && p.gateway === gw);

  const toggle = async (role: string, gw: string) => {
    if (has(role, gw)) {
      const { error } = await (supabase as any).from("role_permissions").delete().eq("role", role).eq("gateway", gw);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase as any).from("role_permissions").insert({ role, gateway: gw });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["role-perms"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>صلاحيات البوابات لكل دور</CardTitle>
        <p className="text-xs text-muted-foreground">المالك والأدمن لديهم وصول كامل تلقائياً. عدّل بقية الأدوار حسب الحاجة (مثل دور "مسؤول").</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-right p-2 border-b sticky right-0 bg-card">الدور / البوابة</th>
              {ALL_GATEWAYS.map((g) => (
                <th key={g} className="p-2 border-b text-center whitespace-nowrap">{gatewayLabel(g)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_ROLES.map((r) => (
              <tr key={r} className="hover:bg-accent/30">
                <td className="p-2 border-b font-semibold sticky right-0 bg-card">{roleLabel(r)}</td>
                {ALL_GATEWAYS.map((g) => (
                  <td key={g} className="p-2 border-b text-center">
                    <Checkbox checked={has(r, g)} onCheckedChange={() => toggle(r, g)} disabled={r === "owner" || r === "admin"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteUserAdmin);
  const onDelete = async () => {
    if (!confirm(`حذف المستخدم ${name}؟`)) return;
    try {
      await del({ data: { user_id: userId } });
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    }
  };
  return (
    <Button variant="destructive" size="sm" onClick={onDelete}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
