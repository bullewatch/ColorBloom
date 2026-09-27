import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://jlyzoxqihqofvsfyqwsw.supabase.co';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_hVIv_LDAyutBHyO1KAPfig_gYso3VYV';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function coloringImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return supabase.storage.from('colorings').getPublicUrl(path).data.publicUrl;
}
