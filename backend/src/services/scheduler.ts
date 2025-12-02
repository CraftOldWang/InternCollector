import cron from "node-cron";
import { AppDataSource } from "../config/database";
import { Job, JobStatus, JobChange, ChangeType, Company } from "../entities";
import { logger } from "./logger";

// 动态导入爬虫模块（避免循环依赖）。使用 runtime require 避免 TypeScript 在编译期解析到外部路径。
async function importCrawler(): Promise<any> {
    try {
        // 使用变量的路径，避免 TypeScript 在编译时解析导入
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = "../../crawler/src/adapters";
        // @ts-ignore
        const mod = require(path);
        return mod;
    } catch (err) {
        return {
            getAdapter: (code: string) => undefined,
            getRegisteredCompanies: () => [],
        };
    }
}

/**
 * 同步爬取结果到数据库
 */
export async function syncJobsToDatabase(
    companyCode: string,
    jobs: Array<{
        postId: string;
        title: string;
        url: string;
        location?: string;
        description?: string;
        requirements?: string;
        salary?: string;
        jobType?: string;
        category?: string;
        tags?: string[];
        postedAt?: Date;
        raw?: Record<string, unknown>;
        contentHash?: string;
    }>
) {
    const jobRepo = AppDataSource.getRepository(Job);
    const changeRepo = AppDataSource.getRepository(JobChange);

    const now = new Date();
    let created = 0;
    let updated = 0;
    let unchanged = 0;

    // 获取当前数据库中该公司的所有活跃岗位
    const existingJobs = await jobRepo.find({
        where: { company: companyCode, status: JobStatus.ACTIVE },
    });
    const existingMap = new Map(existingJobs.map((j) => [j.postId, j]));
    const seenPostIds = new Set<string>();

    for (const jobData of jobs) {
        seenPostIds.add(jobData.postId);
        const existing = existingMap.get(jobData.postId);

        if (!existing) {
            // 新增岗位
            const newJob = jobRepo.create({
                company: companyCode,
                postId: jobData.postId,
                title: jobData.title,
                url: jobData.url,
                location: jobData.location,
                description: jobData.description,
                requirements: jobData.requirements,
                salary: jobData.salary,
                jobType: (jobData.jobType as any) || "intern",
                category: jobData.category,
                tags: jobData.tags,
                postedAt: jobData.postedAt,
                lastCrawledAt: now,
                lastSeenAt: now,
                contentHash: jobData.contentHash,
                raw: jobData.raw,
                status: JobStatus.ACTIVE,
            });

            await jobRepo.save(newJob);

            // 记录变更
            await changeRepo.save(
                changeRepo.create({
                    jobId: newJob.id,
                    changeType: ChangeType.CREATED,
                    snapshot: jobData as any,
                })
            );

            created++;
        } else {
            // 检查是否有更新
            const hasChange = existing.contentHash !== jobData.contentHash;

            if (hasChange) {
                // 记录差异
                const diff: Record<string, { old: unknown; new: unknown }> = {};

                if (existing.title !== jobData.title) {
                    diff.title = { old: existing.title, new: jobData.title };
                }
                if (existing.description !== jobData.description) {
                    diff.description = { old: "(changed)", new: "(changed)" };
                }
                if (existing.location !== jobData.location) {
                    diff.location = {
                        old: existing.location,
                        new: jobData.location,
                    };
                }

                // 更新岗位
                await jobRepo.update(existing.id, {
                    title: jobData.title,
                    description: jobData.description,
                    requirements: jobData.requirements,
                    location: jobData.location,
                    salary: jobData.salary,
                    category: jobData.category,
                    tags: jobData.tags,
                    lastCrawledAt: now,
                    lastSeenAt: now,
                    contentHash: jobData.contentHash as any,
                    raw: jobData.raw as any,
                } as any);

                // 记录变更
                await changeRepo.save(
                    changeRepo.create({
                        jobId: existing.id,
                        changeType: ChangeType.UPDATED,
                        diff,
                    })
                );

                updated++;
            } else {
                // 仅更新最后可见时间
                await jobRepo.update(existing.id, {
                    lastCrawledAt: now,
                    lastSeenAt: now,
                } as any);
                unchanged++;
            }
        }
    }

    // 检测下架的岗位（连续多次未出现）
    const expireThresholdHours = 48; // 48小时未见则标记为下架
    const expireThreshold = new Date(
        now.getTime() - expireThresholdHours * 60 * 60 * 1000
    );

    let expired = 0;
    for (const existing of existingJobs) {
        if (
            !seenPostIds.has(existing.postId) &&
            existing.lastSeenAt < expireThreshold
        ) {
            await jobRepo.update(existing.id, { status: JobStatus.EXPIRED });

            await changeRepo.save(
                changeRepo.create({
                    jobId: existing.id,
                    changeType: ChangeType.REMOVED,
                })
            );

            expired++;
        }
    }

    logger.info(
        `同步完成 [${companyCode}]: 新增=${created}, 更新=${updated}, 无变化=${unchanged}, 下架=${expired}`
    );

    return { created, updated, unchanged, expired };
}

/**
 * 启动定时爬取任务
 */
export function startCrawlScheduler(cronExpression: string = "0 */6 * * *") {
    logger.info(`📅 启动定时爬取任务，cron: ${cronExpression}`);

    cron.schedule(cronExpression, async () => {
        logger.info("⏰ 开始定时爬取任务...");

        try {
            const companyRepo = AppDataSource.getRepository(Company);
            const companies = await companyRepo.find({
                where: { enabled: true },
            });

            for (const company of companies) {
                try {
                    const { getAdapter } = await importCrawler();
                    const adapter = getAdapter(company.code);

                    if (!adapter) {
                        logger.warn(`未找到公司 ${company.code} 的适配器`);
                        continue;
                    }

                    logger.info(`开始抓取: ${company.nameCn || company.name}`);
                    const result = await adapter.crawl();

                    if (result.success) {
                        await syncJobsToDatabase(company.code, result.jobs);
                        await companyRepo.update(company.id, {
                            lastCrawledAt: new Date(),
                        });
                    } else {
                        logger.error(
                            `抓取失败: ${company.code} - ${result.error}`
                        );
                    }
                } catch (error) {
                    logger.error(`处理公司 ${company.code} 时出错:`, error);
                }

                // 公司之间的间隔
                await new Promise((r) => setTimeout(r, 5000));
            }

            logger.info("✅ 定时爬取任务完成");
        } catch (error) {
            logger.error("定时爬取任务失败:", error);
        }
    });
}
