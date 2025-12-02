import {
    ICompanyAdapter,
    CrawlResult,
    JobDetail,
    AdapterConfig,
    JobType,
} from "../types";
import {
    createHttpClient,
    delay,
    retry,
    logger,
    computeJobHash,
} from "../utils";

/**
 * 字节跳动招聘适配器
 *
 * 使用官方 API 获取岗位数据：
 * POST https://jobs.bytedance.com/api/v1/search/job/posts
 */
export class ByteDanceAdapter implements ICompanyAdapter {
    readonly companyCode = "bytedance";
    readonly companyName = "字节跳动";

    private readonly baseUrl = "https://jobs.bytedance.com";
    private readonly apiUrl = `${this.baseUrl}/api/v1/search/job/posts`;
    private readonly http = createHttpClient({
        headers: {
            Referer: "https://jobs.bytedance.com/campus/position",
            Origin: "https://jobs.bytedance.com",
        },
    });

    /**
     * 抓取岗位列表
     */
    async crawl(config?: AdapterConfig): Promise<CrawlResult> {
        const {
            pageSize = 10,
            maxPages = 100,
            delayMs = 1000,
            internOnly = true,
        } = config || {};

        const jobs: JobDetail[] = [];
        let offset = 0;
        let totalCount = 0;
        let hasMore = true;

        logger.info(`🚀 开始抓取 ${this.companyName} 岗位...`);

        try {
            while (hasMore && offset / pageSize < maxPages) {
                const result = await retry(() =>
                    this.fetchPage(offset, pageSize, internOnly)
                );

                if (!result.success || !result.data) {
                    logger.error(`抓取第 ${offset / pageSize + 1} 页失败`);
                    break;
                }

                const {
                    job_post_list = [],
                    has_more,
                    total_count,
                } = result.data;
                totalCount = total_count || totalCount;

                for (const item of job_post_list) {
                    const job = this.parseJob(item);
                    if (job) {
                        jobs.push(job);
                    }
                }

                logger.info(`📄 已抓取 ${jobs.length}/${totalCount} 个岗位`);

                hasMore = has_more && job_post_list.length > 0;
                offset += pageSize;

                if (hasMore) {
                    await delay(delayMs);
                }
            }

            logger.info(
                `✅ ${this.companyName} 抓取完成，共 ${jobs.length} 个岗位`
            );

            return {
                success: true,
                jobs,
                total: totalCount,
                crawledAt: new Date(),
            };
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : String(error);
            logger.error(`❌ ${this.companyName} 抓取失败: ${errorMsg}`);
            return {
                success: false,
                jobs,
                error: errorMsg,
                crawledAt: new Date(),
            };
        }
    }

    /**
     * 抓取单页数据
     */
    private async fetchPage(
        offset: number,
        limit: number,
        internOnly: boolean
    ): Promise<{ success: boolean; data?: ByteDanceApiResponse }> {
        // 首先获取 CSRF token
        const csrfResponse = await this.http.post(
            `${this.baseUrl}/api/v1/csrf/token`
        );
        const csrfToken = csrfResponse.data?.data?.token;

        const payload = {
            keyword: "",
            limit: Number(limit),
            offset: Number(offset),
            job_category_id_list: [],
            tag_id_list: [],
            location_code_list: [],
            subject_id_list: [],
            recruitment_id_list: [],
            portal_type: 3, // 校园招聘
            job_function_id_list: [],
            storefront_id_list: [],
            portal_entrance: 1,
        };

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await this.http.post(this.apiUrl, payload, {
            headers,
        });

        if (response.data?.code === 0) {
            return { success: true, data: response.data.data };
        }

        return { success: false };
    }

    /**
     * 解析单个岗位数据
     */
    private parseJob(item: ByteDanceJobItem): JobDetail | null {
        try {
            const postId = item.id?.toString() || item.job_post_id?.toString();
            if (!postId) return null;

            const jobType = this.parseJobType(item.recruit_type_name);
            const url = `${this.baseUrl}/campus/position/${postId}/detail`;

            const job: JobDetail = {
                company: this.companyCode,
                postId,
                title: item.title || "未知职位",
                url,
                location:
                    item.city_list?.map((c) => c.name).join(", ") ||
                    item.location_name,
                description: item.description,
                requirements: item.requirement,
                jobType,
                category: item.job_function_name,
                tags: this.extractTags(item),
                postedAt: item.publish_time
                    ? new Date(item.publish_time * 1000)
                    : undefined,
                raw: item as unknown as Record<string, unknown>,
            };

            // 计算内容哈希
            (job as JobDetail & { contentHash?: string }).contentHash =
                computeJobHash(job);

            return job;
        } catch (error) {
            logger.warn(`解析岗位数据失败: ${error}`);
            return null;
        }
    }

    /**
     * 解析岗位类型
     */
    private parseJobType(typeName?: string): JobType {
        if (!typeName) return JobType.UNKNOWN;

        const lower = typeName.toLowerCase();
        if (lower.includes("实习") || lower.includes("intern")) {
            return JobType.INTERN;
        }
        if (
            lower.includes("校招") ||
            lower.includes("校园") ||
            lower.includes("campus")
        ) {
            return JobType.CAMPUS;
        }
        if (lower.includes("社招") || lower.includes("social")) {
            return JobType.SOCIAL;
        }
        return JobType.UNKNOWN;
    }

    /**
     * 提取标签
     */
    private extractTags(item: ByteDanceJobItem): string[] {
        const tags: string[] = [];

        if (item.job_function_name) {
            tags.push(item.job_function_name);
        }
        if (item.recruit_type_name) {
            tags.push(item.recruit_type_name);
        }
        if (item.subject_name) {
            tags.push(item.subject_name);
        }

        return tags;
    }

    /**
     * 健康检查
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.http.get(this.baseUrl, {
                timeout: 10000,
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

// 字节跳动 API 响应类型
interface ByteDanceApiResponse {
    job_post_list: ByteDanceJobItem[];
    has_more: boolean;
    total_count: number;
}

interface ByteDanceJobItem {
    id?: number;
    job_post_id?: number;
    title?: string;
    description?: string;
    requirement?: string;
    location_name?: string;
    city_list?: Array<{ code: string; name: string }>;
    job_function_name?: string;
    recruit_type_name?: string;
    subject_name?: string;
    publish_time?: number;
}
