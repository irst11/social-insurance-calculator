import { getSupabaseBrowser } from './supabase-browser'

// 浏览器端计算逻辑（与 lib/calculate.ts 相同，但使用浏览器 Supabase 客户端）

interface SalaryRow {
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

/**
 * 浏览器端核心计算函数
 * 直接从浏览器访问 Supabase，绕过 Next.js 服务端的 TCP 超时问题
 */
export async function calculateContributionsBrowser(
  cityName: string,
  year: string
): Promise<number> {
  const supabase = await getSupabaseBrowser()

  // 1. 获取指定年份的工资数据
  let salaryData, salaryError
  try {
    const result = await supabase
      .from('salaries')
      .select('employee_name, month, salary_amount')
    salaryData = result.data
    salaryError = result.error
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`获取工资数据失败（网络错误）: ${msg}。请检查网络连接和 Supabase 配置。`)
  }

  if (salaryError) {
    throw new Error(`获取工资数据失败: ${salaryError.message}（代码: ${salaryError.code}）`)
  } if (!salaryData) {
    throw new Error('获取工资数据失败: 返回数据为空')
  }

  const salaries = (salaryData ?? []).filter(
    (r: SalaryRow) => r.month.slice(0, 4) === year
  )
  if (salaries.length === 0) {
    throw new Error(`未找到 ${year} 年的工资数据，请检查年份是否与上传数据匹配`)
  }

  // 2. 按员工姓名分组，计算月平均工资
  const groupMap = new Map<string, { total: number; count: number }>()
  for (const row of salaries) {
    const existing = groupMap.get(row.employee_name)
    if (existing) {
      existing.total += row.salary_amount
      existing.count += 1
    } else {
      groupMap.set(row.employee_name, { total: row.salary_amount, count: 1 })
    }
  }

  // 3. 获取城市社保标准（可能有重复记录，取第一条即可）
  const { data: cityDataArray, error: cityError } = await supabase
    .from('cities')
    .select('base_min, base_max, rate')
    .eq('city_name', cityName)
    .eq('year', year)
    .limit(1)

  if (cityError || !cityDataArray || cityDataArray.length === 0) {
    throw new Error(`未找到 ${cityName} ${year} 年的社保标准，请先上传城市数据`)
  }
  const cityData = cityDataArray[0]
  const { base_min, base_max, rate } = cityData

  // 4. 计算每位员工的缴费基数和公司应缴金额
  const results: ResultRow[] = []
  for (const [employee_name, { total, count }] of groupMap) {
    const avg_salary = total / count
    let contribution_base: number
    if (avg_salary < base_min) {
      contribution_base = base_min
    } else if (avg_salary > base_max) {
      contribution_base = base_max
    } else {
      contribution_base = avg_salary
    }
    results.push({
      employee_name,
      avg_salary: Math.round(avg_salary * 100) / 100,
      contribution_base: Math.round(contribution_base * 100) / 100,
      company_fee: Math.round(contribution_base * rate * 100) / 100,
    })
  }

  // 5. 清空 results 表并写入新结果
  const { error: deleteError } = await supabase
    .from('results')
    .delete()
    .neq('id', 0)
  if (deleteError) throw new Error(`清空旧结果失败: ${deleteError.message}`)

  const { error: insertError } = await supabase.from('results').insert(results)
  if (insertError) throw new Error(`写入结果失败: ${insertError.message}`)

  return results.length
}

/**
 * 浏览器端上传 cities 数据
 */
export async function insertCitiesBrowser(rows: {
  city_name: string
  year: string
  base_min: number
  base_max: number
  rate: number
}[]) {
  const supabase = await getSupabaseBrowser()
  const { error } = await supabase.from('cities').insert(rows)
  if (error) throw new Error(`插入 cities 失败: [${error.code}] ${error.message}`)
}

/**
 * 浏览器端上传 salaries 数据
 */
export async function insertSalariesBrowser(rows: {
  employee_id: string
  employee_name: string
  month: string
  salary_amount: number
}[]) {
  const supabase = await getSupabaseBrowser()
  const { error } = await supabase.from('salaries').insert(rows)
  if (error) throw new Error(`插入 salaries 失败: [${error.code}] ${error.message}`)
}

/**
 * 获取城市列表（用于下拉框）
 */
export async function fetchCityNamesBrowser(): Promise<string[]> {
  const supabase = await getSupabaseBrowser()
  const { data, error } = await supabase.from('cities').select('city_name')
  if (error) throw new Error(`获取城市列表失败: ${error.message}`)
  return [...new Set((data ?? []).map((r: { city_name: string }) => r.city_name))]
}

/**
 * 浏览器端获取计算结果
 */
export async function fetchResultsBrowser(): Promise<ResultRow[]> {
  const supabase = await getSupabaseBrowser()
  const { data, error } = await supabase
    .from('results')
    .select('employee_name, avg_salary, contribution_base, company_fee')
    .order('employee_name', { ascending: true })
  if (error) throw new Error(`获取结果失败: ${error.message}`)
  return data ?? []
}
