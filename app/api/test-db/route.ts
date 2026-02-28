import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const tables = ['cities', 'salaries', 'results']
  const report: Record<string, unknown> = {}

  for (const table of tables) {
    try {
      const { data, error, status, statusText } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      report[table] = {
        status,
        statusText,
        ok: !error,
        error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null,
        rowCount: data?.length ?? 0,
      }
    } catch (err) {
      report[table] = { ok: false, thrown: String(err) }
    }
  }

  return NextResponse.json(report)
}

export async function POST() {
  // 测试往 cities 表插入一行数据，检查写入权限
  const testRow = { city_name: '__test__', year: '0000', base_min: 1, base_max: 2, rate: 0.01 }
  let insertResult: Record<string, unknown> = {}
  try {
    const { error, status, statusText } = await supabase.from('cities').insert([testRow])
    insertResult = {
      status,
      statusText,
      ok: !error,
      error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null,
    }
    // 如果插入成功，清除测试数据
    if (!error) {
      await supabase.from('cities').delete().eq('year', '0000').eq('city_name', '__test__')
    }
  } catch (err) {
    insertResult = { ok: false, thrown: String(err) }
  }
  return NextResponse.json({ citiesInsertTest: insertResult })
}
