import { NextRequest, NextResponse } from 'next/server'
import { calculateContributions } from '@/lib/calculate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cityName, year } = body as { cityName?: string; year?: string }

    if (!cityName || !year) {
      return NextResponse.json({ error: '缺少 cityName 或 year 参数' }, { status: 400 })
    }

    const count = await calculateContributions(cityName, year)

    return NextResponse.json({ message: `计算完成，共写入 ${count} 条员工结果` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
