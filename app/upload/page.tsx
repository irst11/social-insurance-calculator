'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  insertCitiesBrowser,
  insertSalariesBrowser,
  calculateContributionsBrowser,
  fetchCityNamesBrowser,
} from '@/lib/calculate-browser'

type Status = { type: 'idle' | 'loading' | 'success' | 'error'; message: string }

function StatusBadge({ status }: { status: Status }) {
  if (status.type === 'idle') return null
  const styles = {
    loading: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <p className={`mt-2 text-sm px-3 py-2 rounded-lg border ${styles[status.type]}`}>
      {status.message}
    </p>
  )
}

/** 规范化 Excel 列名：全部转小写并去除首尾空格 */
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    normalized[key.toLowerCase().trim()] = value
  }
  return normalized
}

/** 用浏览器原生 ArrayBuffer 解析 Excel 文件 */
async function parseExcel(file: File): Promise<Record<string, unknown>[]> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      throw new Error('文件内容为空')
    }

    // 使用 Uint8Array 方式读取，兼容性更好
    const data = new Uint8Array(arrayBuffer)
    const workbook = XLSX.read(data, { type: 'array', cellDates: false })

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel 文件中没有工作表')
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) {
      throw new Error('无法读取第一个工作表')
    }
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    return jsonData
  } catch (err) {
    if (err instanceof Error) {
      // 如果是 xlsx 内部错误，给出更友好的提示
      if (err.message.includes('Subks') || err.message.includes('undefined')) {
        throw new Error('Excel 文件格式不支持或已损坏，请尝试另存为 .xlsx 格式后重试')
      }
      throw new Error(`解析 Excel 失败: ${err.message}`)
    }
    throw new Error('解析 Excel 失败: 未知错误')
  }
}

export default function UploadPage() {
  const [citiesFile, setCitiesFile] = useState<File | null>(null)
  const [salariesFile, setSalariesFile] = useState<File | null>(null)
  const [citiesStatus, setCitiesStatus] = useState<Status>({ type: 'idle', message: '' })
  const [salariesStatus, setSalariesStatus] = useState<Status>({ type: 'idle', message: '' })

  const [cityList, setCityList] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [calcStatus, setCalcStatus] = useState<Status>({ type: 'idle', message: '' })

  // 加载城市列表（直接调浏览器端 Supabase）
  async function loadCities() {
    try {
      const names = await fetchCityNamesBrowser()
      setCityList(names)
      if (names.length > 0) setSelectedCity(names[0])
    } catch {
      // 静默失败，等用户上传城市数据后手动刷新
    }
  }

  useEffect(() => {
    loadCities()
  }, [])

  // 上传 cities Excel（浏览器端解析 + 直接写入 Supabase）
  async function handleCitiesUpload() {
    if (!citiesFile) {
      setCitiesStatus({ type: 'error', message: '请先选择 cities Excel 文件' })
      return
    }
    setCitiesStatus({ type: 'loading', message: '正在解析并上传...' })
    try {
      const rows = await parseExcel(citiesFile)
      if (rows.length === 0) throw new Error('Excel 文件为空')

      const cityRows = rows.map((row, index) => {
        const n = normalizeRow(row)
        const city_name = String(n['city_name'] ?? n['city_namte'] ?? n['cityname'] ?? '').trim()
        const year = String(n['year'] ?? '').trim()
        const base_min = Number(n['base_min'] ?? n['basemin'])
        const base_max = Number(n['base_max'] ?? n['basemax'])
        const rate = Number(n['rate'])
        if (!city_name || !year || isNaN(base_min) || isNaN(base_max) || isNaN(rate)) {
          const keys = Object.keys(n).join(', ')
          throw new Error(`第 ${index + 2} 行数据不完整。检测到列名：[${keys}]`)
        }
        return { city_name, year, base_min, base_max, rate }
      })

      await insertCitiesBrowser(cityRows)
      setCitiesStatus({ type: 'success', message: `成功写入 ${cityRows.length} 条城市数据` })
      await loadCities()
    } catch (err) {
      setCitiesStatus({ type: 'error', message: err instanceof Error ? err.message : '未知错误' })
    }
  }

  // 上传 salaries Excel（浏览器端解析 + 直接写入 Supabase）
  async function handleSalariesUpload() {
    if (!salariesFile) {
      setSalariesStatus({ type: 'error', message: '请先选择 salaries Excel 文件' })
      return
    }
    setSalariesStatus({ type: 'loading', message: '正在解析并上传...' })
    try {
      const rows = await parseExcel(salariesFile)
      if (rows.length === 0) throw new Error('Excel 文件为空')

      const salaryRows = rows.map((row, index) => {
        const n = normalizeRow(row)
        const employee_id = String(n['employee_id'] ?? '').trim()
        const employee_name = String(n['employee_name'] ?? '').trim()
        const month = String(n['month'] ?? '').trim()
        const salary_amount = Number(n['salary_amount'])

        if (!employee_id || !employee_name || !month || isNaN(salary_amount)) {
          throw new Error(`第 ${index + 2} 行数据不完整`)
        }
        if (!/^\d{6}$/.test(month)) {
          throw new Error(`第 ${index + 2} 行 month 格式错误，应为 YYYYMM（如 202401）`)
        }
        return { employee_id, employee_name, month, salary_amount }
      })

      await insertSalariesBrowser(salaryRows)
      setSalariesStatus({ type: 'success', message: `成功写入 ${salaryRows.length} 条工资数据` })
    } catch (err) {
      setSalariesStatus({ type: 'error', message: err instanceof Error ? err.message : '未知错误' })
    }
  }

  // 执行计算（浏览器端直接调 Supabase，不走 Next.js API 路由）
  async function handleCalculate() {
    if (!selectedCity) {
      setCalcStatus({ type: 'error', message: '请选择城市（需先上传城市数据）' })
      return
    }
    if (!year || !/^\d{4}$/.test(year)) {
      setCalcStatus({ type: 'error', message: '请输入有效的4位年份' })
      return
    }
    setCalcStatus({ type: 'loading', message: '正在计算，请稍候...' })
    try {
      const count = await calculateContributionsBrowser(selectedCity, year)
      setCalcStatus({ type: 'success', message: `计算完成，共写入 ${count} 条员工结果` })
    } catch (err) {
      setCalcStatus({ type: 'error', message: err instanceof Error ? err.message : '未知错误' })
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        {/* 顶部导航 */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">数据上传与操作</h1>
        </div>

        {/* 上传 Cities */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <h2 className="text-base font-semibold text-gray-700 mb-1">上传城市社保标准</h2>
          <p className="text-xs text-gray-400 mb-4">
            Excel 列名（Sheet1）：city_name / year / base_min / base_max / rate
          </p>
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <span className="block text-sm text-gray-500 mb-1">选择文件</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setCitiesFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </label>
            <button
              onClick={handleCitiesUpload}
              disabled={citiesStatus.type === 'loading'}
              className="mt-5 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {citiesStatus.type === 'loading' ? '上传中...' : '上传'}
            </button>
          </div>
          <StatusBadge status={citiesStatus} />
        </div>

        {/* 上传 Salaries */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <h2 className="text-base font-semibold text-gray-700 mb-1">上传员工工资数据</h2>
          <p className="text-xs text-gray-400 mb-4">
            Excel 列名（Sheet1）：employee_id / employee_name / month（YYYYMM）/ salary_amount
          </p>
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <span className="block text-sm text-gray-500 mb-1">选择文件</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSalariesFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </label>
            <button
              onClick={handleSalariesUpload}
              disabled={salariesStatus.type === 'loading'}
              className="mt-5 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {salariesStatus.type === 'loading' ? '上传中...' : '上传'}
            </button>
          </div>
          <StatusBadge status={salariesStatus} />
        </div>

        {/* 执行计算 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-1">执行计算并存储结果</h2>
          <p className="text-xs text-gray-400 mb-4">
            选择城市和年份后执行计算，结果将写入 results 表（每次执行前会清空旧数据）
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">城市</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {cityList.length === 0 ? (
                  <option value="">— 请先上传城市数据 —</option>
                ) : (
                  cityList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))
                )}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">年份</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="如 2024"
                maxLength={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={calcStatus.type === 'loading'}
            className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-xl transition-colors"
          >
            {calcStatus.type === 'loading' ? '计算中...' : '执行计算并存储结果'}
          </button>
          <StatusBadge status={calcStatus} />

          {calcStatus.type === 'success' && (
            <div className="mt-3 text-center">
              <Link href="/results" className="text-sm text-green-600 hover:underline">
                前往查看计算结果 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
