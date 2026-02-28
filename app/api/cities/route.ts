import { NextResponse } from 'next/server'
import { fetchCityNames } from '@/lib/db'

export async function GET() {
  try {
    const cities = await fetchCityNames()
    return NextResponse.json({ cities })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
