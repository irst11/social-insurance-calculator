import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { insertSalaries, SalaryRow } from '@/lib/db'

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

    // 映射并验证字段
    const salaryRows: SalaryRow[] = rows.map((row, index) => {
      const employee_id = String(row['employee_id'] ?? '').trim()
      const employee_name = String(row['employee_name'] ?? '').trim()
      const month = String(row['month'] ?? '').trim()
      const salary_amount = Number(row['salary_amount'])

      if (!employee_id || !employee_name || !month || isNaN(salary_amount)) {
        throw new Error(`第 ${index + 2} 行数据不完整或格式错误`)
      }

      // 验证 month 格式为 YYYYMM
      if (!/^\d{6}$/.test(month)) {
        throw new Error(`第 ${index + 2} 行 month 格式错误，应为 YYYYMM（如 202401）`)
      }

      return { employee_id, employee_name, month, salary_amount }
    })

    await insertSalaries(salaryRows)

    return NextResponse.json({ message: `成功写入 ${salaryRows.length} 条工资数据` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
