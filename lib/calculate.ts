import {
  fetchSalariesByYear,
  fetchCityStandard,
  clearAndInsertResults,
  ResultRow,
  SalaryRow,
} from './db'

/**
 * 核心计算函数
 * 1. 读取指定年份的工资数据
 * 2. 按员工姓名分组，计算年度月平均工资
 * 3. 读取城市社保标准
 * 4. 确定缴费基数，计算公司应缴金额
 * 5. 清空 results 表并写入新结果
 * @returns 写入的员工数量
 */
export async function calculateContributions(
  cityName: string,
  year: string
): Promise<number> {
  // 1. 获取指定年份工资数据
  const salaries: SalaryRow[] = await fetchSalariesByYear(year)
  if (salaries.length === 0) {
    throw new Error(`未找到 ${year} 年的工资数据`)
  }

  // 2. 按员工姓名分组，计算平均工资
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

  // 3. 获取城市社保标准
  const standard = await fetchCityStandard(cityName, year)
  if (!standard) {
    throw new Error(`未找到 ${cityName} ${year} 年的社保标准数据`)
  }
  const { base_min, base_max, rate } = standard

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

    const company_fee = contribution_base * rate

    results.push({
      employee_name,
      avg_salary: Math.round(avg_salary * 100) / 100,
      contribution_base: Math.round(contribution_base * 100) / 100,
      company_fee: Math.round(company_fee * 100) / 100,
    })
  }

  // 5. 清空并写入 results 表
  await clearAndInsertResults(results)

  return results.length
}
