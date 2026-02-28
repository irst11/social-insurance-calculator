import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800">五险一金计算器</h1>
        <p className="mt-2 text-gray-500">自动计算公司社保公积金缴纳金额</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* 数据上传卡片 */}
        <Link href="/upload" className="flex-1">
          <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 p-8 cursor-pointer border border-gray-100 hover:border-blue-200 h-full">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-50 group-hover:bg-blue-100 rounded-xl mb-5 transition-colors">
              <svg
                className="w-7 h-7 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">数据上传</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              上传城市社保标准和员工工资 Excel 文件，并触发计算，将结果写入数据库。
            </p>
            <div className="mt-5 flex items-center text-blue-500 text-sm font-medium group-hover:text-blue-600">
              前往上传
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* 结果查询卡片 */}
        <Link href="/results" className="flex-1">
          <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 p-8 cursor-pointer border border-gray-100 hover:border-green-200 h-full">
            <div className="flex items-center justify-center w-14 h-14 bg-green-50 group-hover:bg-green-100 rounded-xl mb-5 transition-colors">
              <svg
                className="w-7 h-7 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">结果查询</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              查看所有员工的年度月平均工资、缴费基数及公司应缴纳金额明细。
            </p>
            <div className="mt-5 flex items-center text-green-500 text-sm font-medium group-hover:text-green-600">
              前往查询
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </main>
  )
}
