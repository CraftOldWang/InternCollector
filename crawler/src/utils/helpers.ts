import crypto from "crypto";

/**
 * 计算内容哈希（用于检测变更）
 */
export function computeContentHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * 从岗位数据计算哈希
 */
export function computeJobHash(job: {
    title: string;
    description?: string;
    location?: string;
    requirements?: string;
}): string {
    const content = [
        job.title,
        job.description || "",
        job.location || "",
        job.requirements || "",
    ].join("|");
    return computeContentHash(content);
}

/**
 * 清理 HTML 标签
 */
export function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
}

/**
 * 解析日期字符串
 */
export function parseDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
}
