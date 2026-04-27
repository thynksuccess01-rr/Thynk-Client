"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * ThemeLoader — mounts invisibly in the admin layout.
 * Reads `preset_vars` (JSON blob of CSS variables) saved by the Theme page
 * and applies them to :root so every page in the admin panel is themed correctly.
 */
export default function ThemeLoader() {
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("theme_config")
      .select("key,value")
      .in("key", ["preset_vars"])
      .single()
      .then(({ data }) => {
        if (!data?.value) return;
        try {
          const vars: Record<string, string> = JSON.parse(data.value);
          const root = document.documentElement;
          Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
        } catch {}
      });
  }, []);

  return null;
}
