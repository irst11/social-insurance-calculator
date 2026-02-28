import { NextResponse } from 'next/server'

export async function GET() {
  // 列出所有以 NEXT_PUBLIC_ 开头的环境变量
  const envVars: Record<string, string | undefined> = {}

  // 只检查我们需要的变量
  envVars['NEXT_PUBLIC_SUPABASE_URL'] = process.env.NEXT_PUBLIC_SUPABASE_URL ? '已设置' : '未设置'
  envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已设置' : '未设置'

  // 也检查不带前缀的版本
  envVars['SUPABASE_URL'] = process.env.SUPABASE_URL ? '已设置' : '未设置'
  envVars['SUPABASE_ANON_KEY'] = process.env.SUPABASE_ANON_KEY ? '已设置' : '未设置'

  return NextResponse.json({
    message: '环境变量调试信息',
    envVars,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
}
