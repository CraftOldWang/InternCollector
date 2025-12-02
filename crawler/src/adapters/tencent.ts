import {
    ICompanyAdapter,
    CrawlResult,
    JobDetail,
    AdapterConfig,
    JobType,
} from "../types";
import { createHttpClient } from "../utils";
import { computeJobHash } from "../utils/helpers";
import { stripHtml, parseDate } from "../utils/helpers";
import { logger } from "../utils/logger";

export class TencentAdapter implements ICompanyAdapter {
    readonly companyCode = "tencent";
    readonly companyName = "腾讯";

    private readonly baseUrl = "https://careers.tencent.com";
    private readonly apiUrl = `${this.baseUrl}/tencentcareer/api/post/Query`;
    private readonly http = createHttpClient({
        headers: {
            Referer: "https://careers.tencent.com/",
            Origin: "https://careers.tencent.com",
        },
    });

    async crawl(config?: AdapterConfig): Promise<CrawlResult> {
        const { pageSize = 10, maxPages = 100, delayMs = 1000, internOnly = true } =
            config || {};

        const jobs: JobDetail[] = [];
        let pageIndex = 1;
        let hasMore = true;

        logger.info(`🚀 开始抓取 ${this.companyName} 岗位...`);

        try {
            while (hasMore && pageIndex <= maxPages) {
                const response = await this.http.get(this.apiUrl, {
                    params: {
                        keyword: "",
                        pageIndex,
                        pageSize,
                    },
                });

                if (response.status !== 200 || !response.data?.Data) {
                    logger.warn(`fetch page ${pageIndex} failed or returned no data`);
                    break;
                }

                const data = response.data.Data;
                const posts = Array.isArray(data.Posts) ? data.Posts : [];

                for (const p of posts) {
                    try {
                        const title = p.RecruitPostName || p.RecruitPostTitle || "";
                        // 筛选实习岗位（若 internOnly=true）
                        if (internOnly) {
                            const titleLower = String(title).toLowerCase();
                            if (
                                !titleLower.includes("实习") &&
                                !titleLower.includes("intern") &&
                                !titleLower.includes("实习生")
                            ) {
                                continue;
                            }
                        }

                        const postId = String(p.PostId || p.RecruitPostId || "");
                        if (!postId) continue;

                        const description = stripHtml(p.Responsibility || p.Description || "");

                        const job: JobDetail = {
                            company: this.companyCode,
                            postId,
                            title: title || "未知职位",
                            url: p.PostURL || `${this.baseUrl}/jobdesc.html?postId=${postId}`,
                            location: p.LocationName || undefined,
                            description: description || undefined,
                            requirements: p.Requirement || undefined,
                            jobType: JobType.INTERN,
                            category: p.CategoryName || undefined,
                            tags: [p.BGName || p.CategoryName].filter(Boolean) as string[],
                            postedAt: parseDate(p.LastUpdateTime) || undefined,
                            raw: p,
                        } as JobDetail & { contentHash?: string };

                        (job as any).contentHash = computeJobHash(job as any);

                        jobs.push(job);
                    } catch (err) {
                        logger.warn(`解析岗位失败: ${err}`);
                        continue;
                    }
                }

                logger.info(
                    `📄 ${this.companyName} 已抓取 ${jobs.length} 个岗位（页码 ${pageIndex}，本页 ${posts.length}）`
                );

                if (posts.length < pageSize) {
                    hasMore = false;
                } else {
                    pageIndex++;
                    if (pageIndex <= maxPages) {
                        await new Promise((r) => setTimeout(r, delayMs));
                    }
                }
            }

            logger.info(`✅ ${this.companyName} 抓取完成，共 ${jobs.length} 个岗位`);

            return {
                success: true,
                jobs,
                total: jobs.length,
                crawledAt: new Date(),
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`❌ ${this.companyName} 抓取失败: ${msg}`);
            return { success: false, jobs, error: msg, crawledAt: new Date() };
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const r = await this.http.get(this.baseUrl, { timeout: 10000 });
            return r.status === 200;
        } catch (e) {
            return false;
        }
    }
}
