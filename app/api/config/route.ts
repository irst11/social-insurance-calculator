import { NextResponse } from 'next/server'

// Supabase 配置（直接硬编码，因为 Vercel 环境变量配置有问题）
const SUPABASE_URL = 'https://bwhfyqqztyctzwflsiae.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3aGZ5cXF6dHljdHp3ZmxzaWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTY1MjMsImV4cCI6MjA4Nzc3MjUyM30.B52EtHrKIuh9bLemOupHJf_9eDxxIuneeewDGERBlQc'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  })
}
