import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
import { initDatabase } from "./config/database";
import { initDefaultCompanies } from "./controllers/companyController";
import { logger, startCrawlScheduler } from "./services";

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// API 路由
app.use("/api", routes);

// 首页
app.get("/", (req, res) => {
    res.json({
        name: "InternCollector API",
        version: "1.0.0",
        description: "实习岗位聚合平台 API",
        endpoints: {
            jobs: "/api/jobs",
            companies: "/api/companies",
            health: "/api/health",
        },
    });
});

// 错误处理
app.use(
    (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        logger.error("Error:", err.message);
        res.status(500).json({
            success: false,
            error:
                process.env.NODE_ENV === "development"
                    ? err.message
                    : "服务器内部错误",
        });
    }
);

// 启动服务
async function bootstrap() {
    try {
        // 初始化数据库
        await initDatabase();

        // 初始化默认公司数据
        await initDefaultCompanies();

        // 启动定时爬取任务（每6小时）
        const cronExpression = process.env.CRAWL_CRON || "0 */6 * * *";
        startCrawlScheduler(cronExpression);

        // 启动 HTTP 服务器
        app.listen(PORT, () => {
            logger.info(`🚀 服务器启动成功: http://localhost:${PORT}`);
            logger.info(`📚 API 文档: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        logger.error("启动失败:", error);
        process.exit(1);
    }
}

bootstrap();
