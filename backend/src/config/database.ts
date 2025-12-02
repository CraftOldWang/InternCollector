import "reflect-metadata";
import { DataSource } from "typeorm";
import { Job, JobChange, Company } from "../entities";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_DATABASE || "intern_collector",
    synchronize: process.env.NODE_ENV === "development", // 开发环境自动同步表结构
    logging: process.env.NODE_ENV === "development",
    entities: [Job, JobChange, Company],
    migrations: [],
    subscribers: [],
});

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<DataSource> {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log("✅ 数据库连接成功");
    }
    return AppDataSource;
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log("📦 数据库连接已关闭");
    }
}
