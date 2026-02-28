# 五险一金计算器 Web 应用 — 项目上下文管理中枢

## 项目目标

公司需要每年核算员工的社保公积金缴纳金额，手动计算繁琐易出错。本项目通过 Web 应用自动化这一流程：从 Excel 导入员工工资和城市社保标准，一键计算并展示结果。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14（App Router） |
| UI / 样式 | Tailwind CSS |
| 数据库 / 后端 | Supabase（PostgreSQL + RESTful API） |
| Excel 解析 | `xlsx`（SheetJS） |
| 语言 | TypeScript |

---

## 数据库设计（Supabase）

### `cities` 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int8 (PK, auto) | 主键 |
| city_name | text | 城市名（如"佛山"） |
| year | text | 年份（如"2024"） |
| base_min | int8 | 社保基数下限 |
| base_max | int8 | 社保基数上限 |
| rate | float8 | 综合缴纳比例（如 0.15） |

### `salaries` 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int8 (PK, auto) | 主键 |
| employee_id | text | 员工工号 |
| employee_name | text | 员工姓名 |
| month | text | 年月（YYYYMM，如"202401"） |
| salary_amount | int8 | 当月工资金额 |

### `results` 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int8 (PK, auto) | 主键 |
| employee_name | text | 员工姓名 |
| avg_salary | float8 | 年度月平均工资 |
| contribution_base | float8 | 最终缴费基数 |
| company_fee | float8 | 公司应缴纳金额 |

> **注意**: 每次执行计算前先清空 results 表，再写入新结果。

### Supabase 建表 SQL（在 Supabase SQL Editor 中执行）

```sql
-- cities 表
CREATE TABLE cities (
  id bigserial PRIMARY KEY,
  city_name text NOT NULL,
  year text NOT NULL,
  base_min bigint NOT NULL,
  base_max bigint NOT NULL,
  rate float8 NOT NULL
);

-- salaries 表
CREATE TABLE salaries (
  id bigserial PRIMARY KEY,
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  month text NOT NULL,
  salary_amount bigint NOT NULL
);

-- results 表
CREATE TABLE results (
  id bigserial PRIMARY KEY,
  employee_name text NOT NULL,
  avg_salary float8 NOT NULL,
  contribution_base float8 NOT NULL,
  company_fee float8 NOT NULL
);
```

---

## Excel 上传格式规范

### cities Excel 文件（Sheet1，列名固定，不区分大小写）
| city_name | year | base_min | base_max | rate |
|-----------|------|----------|----------|------|
| 佛山 | 2024 | 2360 | 28956 | 0.15 |

### salaries Excel 文件（Sheet1，列名固定，不区分大小写）
| employee_id | employee_name | month | salary_amount |
|-------------|---------------|-------|---------------|
| E001 | 张三 | 202401 | 8000 |
| E001 | 张三 | 202402 | 8500 |

---

## 核心业务逻辑

**触发条件**: 用户在 `/upload` 页面选择城市 + 年份，点击"执行计算并存储结果"

**计算步骤**:
1. 从 `salaries` 表过滤出指定年份（month 字段前4位 === 所选年份）的所有记录
2. 按 `employee_name` 分组，计算每位员工的月平均工资：
   `avg_salary = SUM(salary_amount) / COUNT(month记录数)`
3. 从 `cities` 表查询所选城市 + 年份对应的 base_min、base_max、rate
4. 对每位员工确定缴费基数（contribution_base）：
   - `avg_salary < base_min` → `contribution_base = base_min`
   - `avg_salary > base_max` → `contribution_base = base_max`
   - 否则 → `contribution_base = avg_salary`
5. 计算公司缴纳金额：`company_fee = contribution_base × rate`
6. 清空 `results` 表，批量写入所有员工结果

---

## 前端页面设计

### `/`（主页）
- 两个并排的导航卡片
- 卡片一：「数据上传」→ 跳转 `/upload`
- 卡片二：「结果查询」→ 跳转 `/results`
- 风格：简洁卡片式，Tailwind CSS 阴影 + hover 效果

### `/upload`（数据上传与操作页）
- **上传区域一**：选择 cities Excel 文件，点击上传 → 解析后插入 cities 表
- **上传区域二**：选择 salaries Excel 文件，点击上传 → 解析后插入 salaries 表
- **计算区域**：
  - 城市选择下拉框（从 cities 表动态读取所有不重复的 city_name）
  - 年份输入框（默认当前年份）
  - 按钮「执行计算并存储结果」→ 触发 `/api/calculate`
- 所有操作均显示加载状态和成功/失败提示

### `/results`（结果查询与展示页）
- 页面加载时自动从 results 表获取数据
- Tailwind CSS 样式表格，表头：员工姓名 / 年度月平均工资 / 缴费基数 / 公司应缴金额
- 刷新按钮重新加载数据

---

## 项目目录结构

```
social-insurance-calculator/
├── app/
│   ├── layout.tsx            # 根布局
│   ├── page.tsx              # 主页（导航卡片）
│   ├── upload/
│   │   └── page.tsx          # 上传页
│   ├── results/
│   │   └── page.tsx          # 结果页
│   └── api/
│       ├── upload-cities/
│       │   └── route.ts      # POST：解析 cities Excel，写入 cities 表
│       ├── upload-salaries/
│       │   └── route.ts      # POST：解析 salaries Excel，写入 salaries 表
│       └── calculate/
│           └── route.ts      # POST：触发计算，清空并写入 results 表
├── lib/
│   ├── supabase.ts           # Supabase 客户端初始化
│   ├── db.ts                 # 数据库操作封装（CRUD 函数）
│   └── calculate.ts          # 核心计算逻辑函数
├── .env.local                # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
└── claude.md                 # 本文件（项目上下文管理中枢）
```

---

## 环境变量（.env.local）

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Todo List

### 阶段一：环境搭建 ✅
- [x] 1.1 初始化 Next.js 项目（TypeScript + Tailwind CSS + App Router）
- [x] 1.2 安装依赖：`@supabase/supabase-js`、`xlsx`
- [ ] 1.3 在 Supabase 控制台创建三张数据表（见上方 SQL）
- [ ] 1.4 配置 `.env.local`，写入 SUPABASE_URL 和 ANON_KEY

### 阶段二：数据层
- [ ] 2.1 创建 `lib/supabase.ts`，初始化 Supabase 客户端
- [ ] 2.2 创建 `lib/db.ts`，封装数据库操作函数

### 阶段三：核心计算逻辑
- [ ] 3.1 创建 `lib/calculate.ts`，实现 `calculateContributions(cityName, year)` 函数

### 阶段四：API 路由
- [ ] 4.1 创建 `app/api/upload-cities/route.ts`
- [ ] 4.2 创建 `app/api/upload-salaries/route.ts`
- [ ] 4.3 创建 `app/api/calculate/route.ts`

### 阶段五：前端页面
- [ ] 5.1 实现主页 `app/page.tsx`
- [ ] 5.2 实现上传页 `app/upload/page.tsx`
- [ ] 5.3 实现结果页 `app/results/page.tsx`

### 阶段六：测试与收尾
- [ ] 6.1 准备测试 Excel 数据
- [ ] 6.2 端到端测试
- [ ] 6.3 检查边界情况

---

## 验证方案

1. 本地运行 `npm run dev`，访问 `http://localhost:3000`
2. 在 `/upload` 页上传 cities Excel（含佛山2024数据）
3. 上传 salaries Excel（含若干员工数据，覆盖低于下限/正常/超过上限三种情况）
4. 选择城市"佛山"、年份"2024"，点击执行计算
5. 跳转到 `/results` 页，验证计算结果是否符合公式
6. 在 Supabase 控制台直接查看 results 表，做数字交叉验证
