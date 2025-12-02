import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Company } from "../entities";
import { logger } from "../services/logger";
import { syncJobsToDatabase } from "../services/scheduler";

/**
 * 管理员接口：触发指定公司抓取并同步到数据库
 * POST /api/admin/crawl/:company
 */
export async function triggerCrawl(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const companyCode = (req.params.company || "").toLowerCase();
        const path = require("path").resolve(__dirname, "../../../crawler/src/adapters");
        // 动态加载爬虫适配器模块（使用绝对路径以避免 require 路径解析问题）
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(path);
        const adapter = mod.getAdapter(companyCode);
        if (!adapter) {
            return res.status(404).json({ success: false, error: "适配器未实现" });
        }

        logger.info(`手动触发抓取: ${companyCode}`);
        const result = await adapter.crawl();

        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error });
        }

        // 同步到数据库
        await syncJobsToDatabase(companyCode, result.jobs as any);

        // 更新 company lastCrawledAt
        const repo = AppDataSource.getRepository(Company);
        const company = await repo.findOne({ where: { code: companyCode } });
        if (company) {
            await repo.update(company.id, { lastCrawledAt: new Date() });
        }

        res.json({ success: true, data: { crawled: result.jobs.length } });
    } catch (error) {
        next(error);
    }
}
