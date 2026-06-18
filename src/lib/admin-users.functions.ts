import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  phone: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  roles: z.array(z.string()).default([]),
});

export const createUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    // authorize caller as owner/admin
    const { data: rs } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const callerRoles = (rs ?? []).map((r) => r.role);
    if (!callerRoles.some((r) => r === "owner" || r === "admin")) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone ?? null,
        username: data.username ?? data.email.split("@")[0],
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const uid = created.user.id;
    // Replace any default role from trigger with requested ones
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    if (data.roles.length) {
      const rows = data.roles.map((role) => ({
        user_id: uid,
        // cast happens server-side; enum accepts text
        role: role as "owner" | "admin" | "cashier" | "accountant" | "agent" | "branch_manager" | "supervisor",
      }));
      const { error: rerr } = await supabaseAdmin.from("user_roles").insert(rows);
      if (rerr) throw new Error(rerr.message);
    }
    return { ok: true, user_id: uid };
  });

const DeleteUserSchema = z.object({ user_id: z.string().uuid() });

export const deleteUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rs } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const callerRoles = (rs ?? []).map((r) => r.role);
    if (!callerRoles.some((r) => r === "owner" || r === "admin")) {
      throw new Error("Forbidden");
    }
    if (data.user_id === context.userId) throw new Error("لا يمكنك حذف حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
