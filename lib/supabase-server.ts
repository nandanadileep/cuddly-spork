import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin =
    supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, {
              auth: {
                  persistSession: false,
                  autoRefreshToken: false,
              },
          })
        : null

export const getSupabaseBucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'resumes'
