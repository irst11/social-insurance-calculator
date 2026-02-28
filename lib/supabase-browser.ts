import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseBrowserInstance: SupabaseClient | null = null
let initPromise: Promise<void> | null = null

// 从 API 获取配置并初始化客户端
async function ensureInitialized(): Promise<void> {
  if (supabaseBrowserInstance) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    const res = await fetch('/api/config')
    if (!res.ok) {
      throw new Error('无法获取配置')
    }
    const config = await res.json()

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error(
        `Supabase 环境变量未设置。URL: ${config.supabaseUrl ? '已设置' : '未设置'}, KEY: ${config.supabaseAnonKey ? '已设置' : '未设置'}`
      )
    }

    supabaseBrowserInstance = createClient(config.supabaseUrl, config.supabaseAnonKey)
  })()

  return initPromise
}

// 获取浏览器端 Supabase 客户端
export async function getSupabaseBrowser(): Promise<SupabaseClient> {
  await ensureInitialized()
  return supabaseBrowserInstance!
}
