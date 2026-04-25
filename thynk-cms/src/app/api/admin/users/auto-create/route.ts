import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const { client_id, email } = await req.json();
  if (!client_id || !email) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check if user already exists
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).single();
  if (existing) return NextResponse.json({ message: "User already exists" });

  const password = generatePassword();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  await supabase.from("profiles").insert({
    id: authData.user.id,
    email,
    role: "client",
    client_id,
  });

  // TODO: Send welcome email with password via your SMTP of choice
  // For now we just return the temp password (in production, email it)
  return NextResponse.json({ success: true, temp_password: password });
}
