# 实习岗位聚合平台 - InternCollector

一个自动收集各大公司实习岗位信息的聚合平台，让学生便捷查看和跳转投递。

## 🎯 项目特点

-   **自动抓取**：定时从各大公司官网获取最新岗位信息
-   **统一展示**：标准化的岗位数据格式，便于比较和筛选
-   **快速投递**：一键跳转到官方投递页面
-   **变更追踪**：自动检测新增、更新和下架的岗位

## 📁 项目结构

```
InternCollector/
├── backend/          # 后端 API 服务 (Express + TypeORM)
│   ├── src/
│   │   ├── config/       # 数据库配置
│   │   ├── controllers/  # API 控制器
│   │   ├── entities/     # 数据库实体
│   │   ├── routes/       # 路由定义
│   │   ├── services/     # 业务服务（调度器、日志）
│   │   └── main.ts       # 入口文件
│   └── Dockerfile
├── crawler/          # 爬虫模块
│   ├── src/
│   │   ├── adapters/     # 公司适配器
│   │   ├── utils/        # 工具函数
│   │   ├── types.ts      # 类型定义
│   │   └── index.ts      # 爬虫入口
│   └── package.json
├── frontend/         # 前端界面 (React + Vite)
│   ├── src/
│   │   ├── App.tsx       # 主应用组件
│   │   ├── api.ts        # API 客户端
│   │   └── index.css     # 样式
│   └── Dockerfile
└── docker-compose.yml
```

## 🚀 快速开始

### 方式一：本地开发

1. **安装依赖**

```bash
# 根目录
npm install

# 各子项目
cd backend && npm install
cd ../crawler && npm install
cd ../frontend && npm install
```

2. **配置数据库**

确保有一个 PostgreSQL 实例运行，然后复制并修改环境变量：

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，填入数据库连接信息
```

3. **启动后端**

```bash
cd backend
npm run dev
```

4. **运行爬虫**

```bash
cd crawler
npm run crawl:bytedance  # 抓取字节跳动
# 或
npm run crawl            # 抓取所有公司
```

5. **启动前端**

```bash
cd frontend
npm run dev
```

访问 http://localhost:5173 查看界面。

### 方式二：Docker 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问 http://localhost 查看界面。

## 🔌 API 接口

### 岗位接口

| 接口              | 方法 | 描述                           |
| ----------------- | ---- | ------------------------------ |
| `/api/jobs`       | GET  | 获取岗位列表（支持分页、筛选） |
| `/api/jobs/:id`   | GET  | 获取岗位详情                   |
| `/api/jobs/stats` | GET  | 获取岗位统计                   |

**查询参数**：

-   `page` - 页码（默认 1）
-   `limit` - 每页数量（默认 20，最大 100）
-   `company` - 公司筛选
-   `jobType` - 类型筛选（intern/campus/social）
-   `location` - 地点筛选（模糊匹配）
-   `q` - 关键词搜索
-   `sort` - 排序（posted_at_desc/posted_at_asc/updated_at_desc）

### 公司接口

| 接口                   | 方法 | 描述         |
| ---------------------- | ---- | ------------ |
| `/api/companies`       | GET  | 获取公司列表 |
| `/api/companies/:code` | GET  | 获取公司详情 |

## 🕷️ 添加新公司适配器

1. 在 `crawler/src/adapters/` 目录创建新文件，如 `tencent.ts`

2. 实现 `ICompanyAdapter` 接口：

```typescript
import { ICompanyAdapter, CrawlResult, AdapterConfig } from "../types";

export class TencentAdapter implements ICompanyAdapter {
    readonly companyCode = "tencent";
    readonly companyName = "腾讯";

    async crawl(config?: AdapterConfig): Promise<CrawlResult> {
        // 实现抓取逻辑
        // 1. 先尝试找到 API 接口（更高效）
        // 2. 如果没有 API，使用 Playwright 抓取页面
    }

    async healthCheck(): Promise<boolean> {
        // 检查目标网站是否可访问
    }
}
```

3. 在 `crawler/src/adapters/index.ts` 注册适配器：

```typescript
import { TencentAdapter } from "./tencent";
adapterRegistry.set("tencent", () => new TencentAdapter());
```

## 📊 数据库设计

### jobs 表（岗位）

| 字段         | 类型         | 描述                   |
| ------------ | ------------ | ---------------------- |
| id           | UUID         | 主键                   |
| company      | VARCHAR(50)  | 公司代码               |
| post_id      | VARCHAR(100) | 公司内部岗位 ID        |
| title        | TEXT         | 岗位标题               |
| location     | TEXT         | 工作地点               |
| description  | TEXT         | 岗位描述               |
| job_type     | VARCHAR(20)  | 岗位类型               |
| url          | TEXT         | 详情链接               |
| status       | VARCHAR(20)  | 状态（active/expired） |
| posted_at    | TIMESTAMPTZ  | 发布时间               |
| last_seen_at | TIMESTAMPTZ  | 最后可见时间           |

**唯一约束**：`UNIQUE(company, post_id)`

### job_changes 表（变更记录）

记录岗位的创建、更新、下架等变更历史。

### companies 表（公司）

存储支持的公司信息和爬取配置。

## ⚙️ 定时任务

后端服务内置定时任务（默认每 6 小时），自动：

1. 抓取所有已启用公司的岗位
2. 检测新增岗位并入库
3. 检测内容变更并记录
4. 标记长时间未见的岗位为"已下架"

修改定时频率：设置环境变量 `CRAWL_CRON`（cron 表达式）

## 🛡️ 合规与礼貌爬取

-   遵守 robots.txt 规则
-   设置合理的请求间隔
-   使用明确的 User-Agent
-   优先使用官方 API
-   不抓取需要登录的内容

## 📝 TODO

-   [ ] 添加更多公司适配器（腾讯、阿里、美团等）
-   [ ] 实现邮件/微信通知新岗位
-   [ ] 添加用户收藏功能
-   [ ] 支持简历投递追踪
-   [ ] 移动端 APP

## 📄 License

MIT
