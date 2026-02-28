import { NextResponse } from 'next/server'
import { fetchResults } from '@/lib/db'

export async function GET() {
  try {
    const results = await fetchResults()
    return NextResponse.json({ results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
