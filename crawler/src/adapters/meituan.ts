import { ICompanyAdapter, CrawlResult, JobDetail, AdapterConfig, JobType } from "../types";
import { createHttpClient, delay, logger } from "../utils";
import { computeJobHash } from "../utils/helpers";
import { stripHtml, parseDate } from "../utils/helpers";
import { chromium } from "playwright";

export class MeituanAdapter implements ICompanyAdapter {
    readonly companyCode = "meituan";
    readonly companyName = "美团";

    private readonly baseUrl = "https://job.meituan.com";
    private readonly http = createHttpClient({ headers: { Referer: "https://job.meituan.com", Origin: "https://job.meituan.com" } });

    async crawl(config?: AdapterConfig): Promise<CrawlResult> {
        const { pageSize = 10, maxPages = 20, delayMs = 2000, internOnly = true } = config || {};
        const jobs: JobDetail[] = [];

        logger.info(`🚀 开始抓取 ${this.companyName} 岗位... (Playwright)`);

        try {
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto(`${this.baseUrl}/web/home`, { waitUntil: 'networkidle', timeout: 30000 });
            await page.goto(`${this.baseUrl}/web/job/list`, { waitUntil: 'networkidle', timeout: 30000 });

            await page.waitForSelector('.job-list, .position-item', { timeout: 10000 }).catch(() => null);

            const items = await page.$$eval('.position-item, .job-item', (nodes) => nodes.map((n) => {
                const titleEl = n.querySelector('.positionName, .job-title') as HTMLElement | null;
                const title = titleEl?.innerText || '';
                const hrefEl = n.querySelector('a') as HTMLAnchorElement | null;
                const url = hrefEl ? hrefEl.href : '';
                const locationEl = n.querySelector('.workCity, .job-location') as HTMLElement | null;
                const location = locationEl?.innerText || '';
                const summaryEl = n.querySelector('.workResponsibility, .job-desc') as HTMLElement | null;
                const summary = summaryEl?.innerText || '';
                return { title, url, location, summary };
            }));

            for (const it of items || []) {
                try {
                    const job: JobDetail = {
                        company: this.companyCode,
                        postId: it.url || computeJobHash({ title: it.title, description: it.summary || '', location: it.location }),
                        title: it.title || '未知职位',
                        url: it.url || '',
                        location: it.location || undefined,
                        description: it.summary || undefined,
                        requirements: undefined,
                        jobType: internOnly ? JobType.INTERN : JobType.UNKNOWN,
                        category: undefined,
                        tags: undefined,
                        postedAt: undefined,
                        raw: it as any,
                    } as JobDetail & { contentHash?: string };

                    (job as any).contentHash = computeJobHash(job as any);
                    jobs.push(job);
                } catch (e) {
                    logger.warn('解析美团岗位失败', e);
                }
            }

            await browser.close();

            logger.info(`✅ ${this.companyName} 抓取完成，共 ${jobs.length} 个岗位`);
            return { success: true, jobs, total: jobs.length, crawledAt: new Date() };
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            logger.error(`❌ ${this.companyName} 抓取失败: ${errMsg}`);
            return { success: false, jobs, error: errMsg, crawledAt: new Date() };
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
