import { createClient } from '@supabase/supabase-js'
import { Agent, fetch as undiciFetch } from 'undici'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 使用 undici 自己的 fetch（而不是 Next.js patch 过的全局 fetch），
// 并传入自定义 Agent，将 TCP connect timeout 从默认 10s 提高到 60s。
// 这是解决 Supabase free tier 冷启动时 ConnectTimeoutError 的根本方案。
const agent = new Agent({
  connect: { timeout: 60_000 },     // TCP 连接超时 60s（Supabase 冷启动可能需要 30-50s）
  keepAliveTimeout: 30_000,          // 连接保活 30s，减少后续请求需要重新建连的概率
  keepAliveMaxTimeout: 60_000,
})

const customFetch = (
  url: Parameters<typeof globalThis.fetch>[0],
  options?: Parameters<typeof globalThis.fetch>[1]
) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  undiciFetch(url as string | URL, {
    ...(options as any),
    dispatcher: agent,
  }) as unknown as ReturnType<typeof globalThis.fetch>

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: customFetch },
})
