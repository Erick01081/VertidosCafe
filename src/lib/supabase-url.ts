/** Accepts either the Supabase project URL or its REST endpoint from Vercel env settings. */
export function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  const url = value?.trim().replace(/\/+$/, '');
  if (!url) return undefined;
  return url.replace(/\/(?:rest|storage|auth)\/v1$/i, '');
}
