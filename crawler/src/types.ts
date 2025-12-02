/**
 * 爬虫模块共享类型定义
 */

/**
 * 岗位类型
 */
export enum JobType {
    INTERN = "intern",
    CAMPUS = "campus",
    SOCIAL = "social",
    UNKNOWN = "unknown",
}

/**
 * 岗位摘要信息（列表页抓取）
 */
export interface JobMeta {
    company: string;
    postId: string;
    title: string;
    url: string;
    location?: string;
    jobType?: JobType;
    category?: string;
    postedAt?: Date;
}

/**
 * 岗位详细信息
 */
export interface JobDetail extends JobMeta {
    description?: string;
    requirements?: string;
    salary?: string;
    tags?: string[];
    raw?: Record<string, unknown>;
}

/**
 * 爬虫适配器抓取结果
 */
export interface CrawlResult {
    success: boolean;
    jobs: JobDetail[];
    total?: number;
    error?: string;
    crawledAt: Date;
}

/**
 * 适配器配置
 */
export interface AdapterConfig {
    /** 每页数量 */
    pageSize?: number;
    /** 最大页数 */
    maxPages?: number;
    /** 请求延迟（毫秒） */
    delayMs?: number;
    /** 是否只抓取实习岗位 */
    internOnly?: boolean;
    /** 自定义请求头 */
    headers?: Record<string, string>;
}

/**
 * 公司适配器接口
 * 每个公司实现这个接口来定义自己的抓取逻辑
 */
export interface ICompanyAdapter {
    /** 公司标识 */
    readonly companyCode: string;

    /** 公司名称 */
    readonly companyName: string;

    /**
     * 抓取岗位列表
     * @param config 配置选项
     * @returns 抓取结果
     */
    crawl(config?: AdapterConfig): Promise<CrawlResult>;

    /**
     * 健康检查 - 检测目标网站是否可访问
     */
    healthCheck(): Promise<boolean>;
}

/**
 * HTTP 请求配置
 */
export interface HttpRequestConfig {
    url: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    params?: Record<string, string | number>;
    data?: unknown;
    timeout?: number;
}
