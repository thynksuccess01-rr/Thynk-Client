import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { clientId, fileName, filePath, fileUrl, fileType, fileSize, category, description, uploadedBy } = body;

    if (!clientId || !fileName || !filePath || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = (buckets ?? []).some((b: any) => b.id === "client-documents");
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket("client-documents", {
        public: true,
        fileSizeLimit: 52428800,
      });
    }

    // Insert document record (service role bypasses RLS)
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("client_documents")
      .insert({
        client_id:   clientId,
        uploaded_by: uploadedBy,
        file_name:   fileName,
        file_path:   filePath,
        file_url:    fileUrl,
        file_type:   fileType || "application/octet-stream",
        file_size:   fileSize,
        category:    category || "general",
        description: description || null,
      })
      .select()
      .single();

    if (docErr) {
      return NextResponse.json({ error: docErr.message }, { status: 500 });
    }

    // Send notification to client (service role)
    await supabaseAdmin.from("notifications").insert({
      client_id:  clientId,
      type:       "document",
      title:      `📎 New document shared: ${fileName}`,
      body:       description || `A new ${category || "general"} document has been shared with you.`,
      metadata:   { file_name: fileName, category: category || "general" },
      created_by: uploadedBy,
    });

    return NextResponse.json({ ok: true, doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
