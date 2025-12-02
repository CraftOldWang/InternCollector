import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { logger } from "./logger";

/**
 * 创建带有默认配置的 HTTP 客户端
 */
export function createHttpClient(
    baseConfig?: AxiosRequestConfig
): AxiosInstance {
    const client = axios.create({
        timeout: 30000,
        headers: {
            "User-Agent":
                "InternCollector/1.0 (https://github.com/example/intern-collector; contact@example.com)",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        ...baseConfig,
    });

    // 如果传入了 jar 或者启用了 withCredentials，则自动启用 cookieJar 支持
    try {
        const jar = new CookieJar();
        wrapper(client as any);
        (client as any).defaults.jar = jar;
        (client as any).defaults.withCredentials = true;
    } catch (e) {
        // 忽略，如果模块未安装或出现错误
    }

    // 请求拦截器
    client.interceptors.request.use(
        (config) => {
            logger.debug(
                `HTTP Request: ${config.method?.toUpperCase()} ${config.url}`
            );
            return config;
        },
        (error) => {
            logger.error("HTTP Request Error:", error.message);
            return Promise.reject(error);
        }
    );

    // 响应拦截器
    client.interceptors.response.use(
        (response) => {
            logger.debug(
                `HTTP Response: ${response.status} ${response.config.url}`
            );
            return response;
        },
        (error) => {
            if (error.response) {
                logger.error(
                    `HTTP Error ${error.response.status}: ${error.config?.url}`
                );
            } else {
                logger.error("HTTP Error:", error.message);
            }
            return Promise.reject(error);
        }
    );

    return client;
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 随机延迟（用于礼貌爬取）
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return delay(ms);
}

/**
 * 重试执行
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; delayMs?: number; backoff?: boolean } = {}
): Promise<T> {
    const { maxRetries = 3, delayMs = 1000, backoff = true } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            logger.warn(
                `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
            );

            if (attempt < maxRetries) {
                const waitTime = backoff
                    ? delayMs * Math.pow(2, attempt - 1)
                    : delayMs;
                await delay(waitTime);
            }
        }
    }

    throw lastError;
}
