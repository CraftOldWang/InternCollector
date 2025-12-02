import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Company } from "../entities";
import { Job, JobStatus } from "../entities";

const companyRepository = () => AppDataSource.getRepository(Company);
const jobRepository = () => AppDataSource.getRepository(Job);

/**
 * 获取公司列表（包含岗位统计）
 * GET /api/companies
 */
export async function getCompanies(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        // 获取所有公司
        const companies = await companyRepository().find({
            order: { name: "ASC" },
        });

        // 获取每个公司的岗位数量
        const jobCounts = await jobRepository()
            .createQueryBuilder("job")
            .select("job.company", "company")
            .addSelect("COUNT(*)", "count")
            .where("job.status = :status", { status: JobStatus.ACTIVE })
            .groupBy("job.company")
            .getRawMany();

        const countMap = new Map(
            jobCounts.map((c) => [c.company, parseInt(c.count)])
        );

        // 合并数据
        const result = companies.map((company) => ({
            ...company,
            jobCount: countMap.get(company.code) || 0,
        }));

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 获取单个公司详情
 * GET /api/companies/:code
 */
export async function getCompanyByCode(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { code } = req.params;

        const company = await companyRepository().findOne({
            where: { code: code.toLowerCase() },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: "公司不存在",
            });
        }

        // 获取岗位数量
        const jobCount = await jobRepository().count({
            where: {
                company: company.code,
                status: JobStatus.ACTIVE,
            },
        });

        res.json({
            success: true,
            data: {
                ...company,
                jobCount,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 初始化默认公司数据
 */
export async function initDefaultCompanies() {
    const defaultCompanies = [
        {
            code: "bytedance",
            name: "ByteDance",
            nameCn: "字节跳动",
            website: "https://www.bytedance.com",
            careersUrl: "https://jobs.bytedance.com/campus/position",
            enabled: true,
        },
        {
            code: "tencent",
            name: "Tencent",
            nameCn: "腾讯",
            website: "https://www.tencent.com",
            careersUrl: "https://careers.tencent.com",
            enabled: false, // 暂未实现
        },
        {
            code: "alibaba",
            name: "Alibaba",
            nameCn: "阿里巴巴",
            website: "https://www.alibaba.com",
            careersUrl: "https://talent.alibaba.com",
            enabled: false,
        },
        {
            code: "meituan",
            name: "Meituan",
            nameCn: "美团",
            website: "https://www.meituan.com",
            careersUrl: "https://job.meituan.com",
            enabled: false,
        },
    ];

    const repo = companyRepository();

    for (const companyData of defaultCompanies) {
        const existing = await repo.findOne({
            where: { code: companyData.code },
        });
        if (!existing) {
            await repo.save(repo.create(companyData));
            console.log(`✅ 初始化公司: ${companyData.nameCn}`);
        }
    }
}
