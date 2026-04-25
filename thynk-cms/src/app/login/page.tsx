"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (profile?.role === "admin") router.push("/admin/dashboard");
      else router.push("/portal/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2C1A0F 0%, #3D2314 40%, #1A0F08 100%)" }}>
      <div className="w-full max-w-md px-6">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}>
            <span className="text-2xl font-display font-bold" style={{ color: "#D4A843" }}>T</span>
          </div>
          <h1 className="text-3xl font-display font-semibold text-cream-100">Thynk CMS</h1>
          <p className="text-sm mt-1.5" style={{ color: "#C27B4A" }}>Client Management Platform</p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl" style={{ background: "rgba(253,250,245,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(237,217,176,0.15)" }}>
          <h2 className="text-lg font-semibold text-cream-100 mb-6">Sign in to your account</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#C27B4A" }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "rgba(253,250,245,0.07)", border: "1px solid rgba(237,217,176,0.2)", color: "#FAF4E8" }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#C27B4A" }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "rgba(253,250,245,0.07)", border: "1px solid rgba(237,217,176,0.2)", color: "#FAF4E8" }}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 mt-2 disabled:opacity-60"
              style={{ background: "#A86035", color: "#FAF4E8" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-xs text-center mt-6" style={{ color: "rgba(250,244,232,0.4)" }}>
            Access is invitation-only. Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
