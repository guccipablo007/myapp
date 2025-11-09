// src/lib/userRole.ts
import { supabase as supabaseFactory } from "@/lib/supabase";

export type AppRole = "sysadmin" | "secretary" | "member" | "guest";

export async function getCurrentUserRole(): Promise<AppRole> {
  // ✅ instantiate the client from the factory
  const sb = supabaseFactory();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return "guest";

  // user_profiles has: user_id (uuid), role (text)
  const { data, error } = await sb
    .from("user_profiles")
    .select("role")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error || !data?.role) return "member";
  const role = String(data.role).toLowerCase();

  if (role === "sysadmin" || role === "secretary") return role as AppRole;
  if (role === "member") return "member";
  return "guest";
}
