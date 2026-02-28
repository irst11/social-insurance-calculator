import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { insertCities, CityRow } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '未收到文件' }, { status: 400 })
    }

    // 读取文件内容，用 Buffer 方式（比 ArrayBuffer + type:'array' 更稳定）
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // 将 sheet 转为 JSON（第一行为表头）
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel 文件为空' }, { status: 400 })
    }

    // 映射并验证字段（列名统一转小写以兼容大小写差异）
    const cityRows: CityRow[] = rows.map((row, index) => {
      // 将所有列名转为小写，消除大小写和常见拼写问题
      const normalized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        normalized[key.toLowerCase().trim()] = value
      }

      // city_name 兼容常见拼写变体（如 city_namte）
      const city_name = String(
        normalized['city_name'] ?? normalized['city_namte'] ?? normalized['cityname'] ?? ''
      ).trim()
      // year 兼容数字类型（Excel 中年份可能是数字）
      const year = String(normalized['year'] ?? '').trim()
      const base_min = Number(normalized['base_min'] ?? normalized['basemin'])
      const base_max = Number(normalized['base_max'] ?? normalized['basemax'])
      const rate = Number(normalized['rate'])

      if (!city_name || !year || isNaN(base_min) || isNaN(base_max) || isNaN(rate)) {
        const foundKeys = Object.keys(normalized).join(', ')
        console.error('[upload-cities] 数据验证失败', { row: index + 2, foundKeys, city_name, year, base_min, base_max, rate })
        throw new Error(
          `第 ${index + 2} 行数据不完整。检测到的列名：[${foundKeys}]。` +
          `需要的列名：city_name / year / base_min / base_max / rate`
        )
      }

      return { city_name, year, base_min, base_max, rate }
    })

    console.log('[upload-cities] 解析完成，准备写入', cityRows.length, '条数据:', JSON.stringify(cityRows))

    await insertCities(cityRows)

    return NextResponse.json({ message: `成功写入 ${cityRows.length} 条城市数据` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误'
    console.error('[upload-cities] 错误:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
