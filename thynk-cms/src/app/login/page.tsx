"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@thynksuccess.com");
  const [password, setPassword] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLog([]);

    try {
      const supabase = createClient();
      setLog(p => [...p, "1. Supabase client created"]);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLog(p => [...p, "AUTH ERROR: " + error.message + " (code: " + error.status + ")"]);
        setLoading(false);
        return;
      }

      setLog(p => [...p, "2. Auth success, user: " + data.user?.id]);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        setLog(p => [...p, "PROFILE ERROR: " + profileError.message]);
        setLoading(false);
        return;
      }

      setLog(p => [...p, "3. Profile role: " + profile?.role]);
      setLog(p => [...p, "4. Redirecting to /admin/dashboard..."]);
      
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      setLog(p => [...p, "EXCEPTION: " + err.message]);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a0f08", fontFamily: "monospace" }}>
      <div style={{ width: 480, padding: 32, background: "#2c1a0f", borderRadius: 16, border: "1px solid #3d2314" }}>
        <h1 style={{ color: "#d4a843", marginBottom: 24, fontSize: 20 }}>Thynk CMS — Login Debug</h1>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "#c27b4a", fontSize: 12, display: "block", marginBottom: 4 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: "#1a0f08", border: "1px solid #3d2314", borderRadius: 8, color: "#faf4e8", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#c27b4a", fontSize: 12, display: "block", marginBottom: 4 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: "#1a0f08", border: "1px solid #3d2314", borderRadius: 8, color: "#faf4e8", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#a86035", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {log.length > 0 && (
          <div style={{ marginTop: 20, padding: 16, background: "#1a0f08", borderRadius: 8, border: "1px solid #3d2314" }}>
            <p style={{ color: "#d4a843", fontSize: 11, marginBottom: 8 }}>DEBUG LOG:</p>
            {log.map((l, i) => (
              <p key={i} style={{ color: l.includes("ERROR") || l.includes("EXCEPTION") ? "#ef4444" : "#86efac", fontSize: 12, margin: "4px 0" }}>
                {l}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
