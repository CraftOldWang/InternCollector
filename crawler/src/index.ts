import dotenv from "dotenv";
dotenv.config();

import { getAdapter, getRegisteredCompanies, getAllAdapters } from "./adapters";
import { logger } from "./utils";
import { CrawlResult } from "./types";

/**
 * 爬虫主入口
 */
async function main() {
    const args = process.argv.slice(2);
    const companyArg = args.find((a) => a.startsWith("--company="));
    const targetCompany = companyArg?.split("=")[1];

    logger.info("🕷️ 实习岗位爬虫启动");
    logger.info(`📋 已注册公司: ${getRegisteredCompanies().join(", ")}`);

    const results: Map<string, CrawlResult> = new Map();

    if (targetCompany) {
        // 抓取指定公司
        const adapter = getAdapter(targetCompany);
        if (!adapter) {
            logger.error(`❌ 未找到公司 "${targetCompany}" 的适配器`);
            process.exit(1);
        }

        logger.info(`🎯 目标公司: ${adapter.companyName}`);
        const result = await adapter.crawl();
        results.set(adapter.companyCode, result);
    } else {
        // 抓取所有公司
        const adapters = getAllAdapters();
        logger.info(`🎯 将抓取 ${adapters.length} 家公司`);

        for (const adapter of adapters) {
            logger.info(`\n${"=".repeat(50)}`);
            logger.info(`开始抓取: ${adapter.companyName}`);

            const result = await adapter.crawl();
            results.set(adapter.companyCode, result);

            // 公司之间的延迟
            if (adapters.indexOf(adapter) < adapters.length - 1) {
                logger.info("等待 3 秒后继续...");
                await new Promise((r) => setTimeout(r, 3000));
            }
        }
    }

    // 输出汇总
    logger.info(`\n${"=".repeat(50)}`);
    logger.info("📊 抓取结果汇总:");

    let totalJobs = 0;
    for (const [company, result] of results) {
        const status = result.success ? "✅" : "❌";
        logger.info(`  ${status} ${company}: ${result.jobs.length} 个岗位`);
        totalJobs += result.jobs.length;
    }

    logger.info(`\n📈 总计: ${totalJobs} 个岗位`);

    // 输出示例数据
    if (totalJobs > 0) {
        const firstResult = Array.from(results.values()).find(
            (r) => r.jobs.length > 0
        );
        if (firstResult) {
            logger.info("\n📝 示例岗位数据:");
            const sample = firstResult.jobs.slice(0, 3);
            for (const job of sample) {
                logger.info(`  - ${job.title} @ ${job.location || "未知"}`);
                logger.info(`    URL: ${job.url}`);
            }
        }
    }
}

main().catch((error) => {
    logger.error("爬虫执行失败:", error);
    process.exit(1);
});
