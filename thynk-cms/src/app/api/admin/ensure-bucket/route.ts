import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Use service role key to create bucket (anon key cannot create buckets)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Check if bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = (buckets ?? []).some((b: any) => b.id === "client-documents");

    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket("client-documents", {
        public: true,
        allowedMimeTypes: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
          "audio/*",
          "video/*",
          "image/*",
          "text/plain",
        ],
        fileSizeLimit: 52428800, // 50MB
      });
      if (error && !error.message.includes("already exists")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, existed: exists });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
