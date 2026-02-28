import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 环境变量未设置。请确保 .env.local 文件中有 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY，并重启开发服务器。'
  )
}

// 浏览器端 Supabase 客户端：使用浏览器原生 fetch，无超时限制问题
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey)
