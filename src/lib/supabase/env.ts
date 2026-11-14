export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith("http") &&
      !url.includes("your-project-ref.supabase.co") &&
      key !== "your-anon-key-here"
  );
}

export function getSupabaseEnv() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const url = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return { url, anonKey };
}
