import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://oirnhlcuhdmtwaqmazfv.supabase.co/rest/v1/',
  supabaseAnonKey || 'sb_publishable_qXI3X8dDRUJXTgxCW5JDVg_vi2GcWFz'
)
