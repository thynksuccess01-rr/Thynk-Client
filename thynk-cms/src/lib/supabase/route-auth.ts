import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

/**
 * Identifies who is calling an API route. Works for BOTH:
 *  - the website (session cookie), and
 *  - the mobile app (Authorization: Bearer <access token>).
 * Returns the user + profile, plus a service-role client for the actual write.
 */
export async function getCaller(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createServiceClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  let user: { id: string; email?: string | null } | null = null;
  const header = req.headers.get("authorization");
  if (header && header.toLowerCase().startsWith("bearer ")) {
    const { data } = await admin.auth.getUser(header.slice(7).trim());
    user = data.user;
  } else {
    const cookieStore = cookies();
    const supabase = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }
  if (!user) return { admin, user: null, profile: null };

  const { data: profile } = await admin
    .from("profiles").select("client_id, full_name, role").eq("id", user.id).single();
  return { admin, user, profile };
}
