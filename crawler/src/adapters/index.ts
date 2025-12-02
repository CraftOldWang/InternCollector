import { ICompanyAdapter } from "../types";
import { ByteDanceAdapter } from "./bytedance";

/**
 * 适配器注册表
 * 添加新公司时，在这里注册对应的适配器
 */
const adapterRegistry: Map<string, () => ICompanyAdapter> = new Map();

// 注册已实现的适配器
adapterRegistry.set("bytedance", () => new ByteDanceAdapter());

/**
 * 获取指定公司的适配器
 */
export function getAdapter(companyCode: string): ICompanyAdapter | undefined {
    const factory = adapterRegistry.get(companyCode.toLowerCase());
    return factory ? factory() : undefined;
}

/**
 * 获取所有已注册的公司代码
 */
export function getRegisteredCompanies(): string[] {
    return Array.from(adapterRegistry.keys());
}

/**
 * 获取所有适配器实例
 */
export function getAllAdapters(): ICompanyAdapter[] {
    return getRegisteredCompanies().map((code) => getAdapter(code)!);
}

// 导出所有适配器类
export { ByteDanceAdapter } from "./bytedance";
