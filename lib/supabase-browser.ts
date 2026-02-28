import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseBrowserInstance: SupabaseClient | null = null

// 获取浏览器端 Supabase 客户端（延迟初始化）
function getSupabaseBrowser() {
  if (!supabaseBrowserInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase 环境变量未设置。请确保 Vercel 中配置了 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。'
      )
    }
    supabaseBrowserInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseBrowserInstance
}

// 浏览器端 Supabase 客户端：使用浏览器原生 fetch，无超时限制问题
// 使用 Proxy 实现懒加载，避免构建时初始化
export const supabaseBrowser = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseBrowser()
    const value = client[prop as keyof SupabaseClient]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})
