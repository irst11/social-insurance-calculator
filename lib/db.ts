import { supabase } from './supabase'

// ---- 类型定义 ----

export interface CityRow {
  city_name: string
  year: string
  base_min: number
  base_max: number
  rate: number
}

export interface SalaryRow {
  employee_id: string
  employee_name: string
  month: string
  salary_amount: number
}

export interface ResultRow {
  employee_name: string
  avg_salary: number
  contribution_base: number
  company_fee: number
}

// ---- 工具：自动重试（处理 Supabase 冷启动 TCP 超时）----

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('fetch failed') || msg.includes('ConnectTimeout') || msg.includes('UND_ERR')
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 3000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt < retries && isNetworkError(err)) {
        console.warn(`[db] 第 ${attempt + 1} 次请求失败（网络超时），${delayMs / 1000}s 后重试...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }
      throw err
    }
  }
  throw new Error('重试次数耗尽')
}

// ---- cities 表操作 ----

export async function insertCities(rows: CityRow[]) {
  await withRetry(async () => {
    const { error } = await supabase.from('cities').insert(rows)
    if (error) {
      throw new Error(
        `插入 cities 失败: [${error.code}] ${error.message}` +
        `${error.details ? ' | ' + error.details : ''}` +
        `${error.hint ? ' | 提示: ' + error.hint : ''}`
      )
    }
  })
}

export async function fetchCityNames(): Promise<string[]> {
  return withRetry(async () => {
    const { data, error } = await supabase.from('cities').select('city_name')
    if (error) throw new Error(`获取城市列表失败: ${error.message}`)
    return [...new Set((data ?? []).map((r: { city_name: string }) => r.city_name))]
  })
}

export async function fetchCityStandard(
  cityName: string,
  year: string
): Promise<{ base_min: number; base_max: number; rate: number } | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('base_min, base_max, rate')
      .eq('city_name', cityName)
      .eq('year', year)
      .single()
    if (error) return null
    return data
  })
}

// ---- salaries 表操作 ----

export async function insertSalaries(rows: SalaryRow[]) {
  await withRetry(async () => {
    const { error } = await supabase.from('salaries').insert(rows)
    if (error) {
      throw new Error(`插入 salaries 失败: [${error.code}] ${error.message}`)
    }
  })
}

export async function fetchSalariesByYear(year: string): Promise<SalaryRow[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('salaries')
      .select('employee_id, employee_name, month, salary_amount')
    if (error) throw new Error(`获取工资数据失败: ${error.message}`)
    return (data ?? []).filter((r: SalaryRow) => r.month.slice(0, 4) === year)
  })
}

// ---- results 表操作 ----

export async function clearAndInsertResults(rows: ResultRow[]) {
  await withRetry(async () => {
    const { error: deleteError } = await supabase
      .from('results')
      .delete()
      .neq('id', 0)
    if (deleteError) throw new Error(`清空 results 失败: ${deleteError.message}`)

    const { error: insertError } = await supabase.from('results').insert(rows)
    if (insertError) throw new Error(`插入 results 失败: ${insertError.message}`)
  })
}

export async function fetchResults(): Promise<ResultRow[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('results')
      .select('employee_name, avg_salary, contribution_base, company_fee')
      .order('employee_name', { ascending: true })
    if (error) throw new Error(`获取计算结果失败: ${error.message}`)
    return data ?? []
  })
}
