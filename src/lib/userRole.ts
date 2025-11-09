// src/lib/userRole.ts
import { supabase } from "@/lib/supabase";

export type AppRole = "sysadmin" | "secretary" | "member" | "guest";

export async function getCurrentUserRole(): Promise<AppRole> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return "guest";

  // user_profiles: user_id, full_name, role  (we created this earlier)
  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error || !data?.role) return "member"; // safe fallback
  return (data.role as AppRole) ?? "member";
}
