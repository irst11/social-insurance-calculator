import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 服务端 Supabase 客户端（用于 API 路由）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
