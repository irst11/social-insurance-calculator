import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 在模块顶层读取环境变量（Next.js 会在构建时替换 NEXT_PUBLIC_ 变量）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let supabaseBrowserInstance: SupabaseClient | null = null

// 获取浏览器端 Supabase 客户端
export function getSupabaseBrowser(): SupabaseClient {
  if (!supabaseBrowserInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        `Supabase 环境变量未设置。URL: ${supabaseUrl ? '已设置' : '未设置'}, KEY: ${supabaseAnonKey ? '已设置' : '未设置'}`
      )
    }
    supabaseBrowserInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseBrowserInstance
}

// 浏览器端 Supabase 客户端
export const supabaseBrowser: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseBrowser()
    const value = client[prop as keyof SupabaseClient]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})
