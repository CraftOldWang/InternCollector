import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Job, JobStatus, JobType } from "../entities";
import { FindOptionsWhere, Like, MoreThan, In } from "typeorm";

const jobRepository = () => AppDataSource.getRepository(Job);

/**
 * 获取岗位列表
 * GET /api/jobs
 *
 * Query 参数:
 * - page: 页码（默认 1）
 * - limit: 每页数量（默认 20，最大 100）
 * - company: 公司代码筛选
 * - jobType: 岗位类型筛选（intern/campus/social）
 * - status: 状态筛选（active/expired）
 * - location: 地点筛选（模糊匹配）
 * - q: 关键词搜索
 * - updated_after: 更新时间筛选（ISO 8601）
 * - sort: 排序方式（posted_at_desc/posted_at_asc/updated_at_desc）
 */
export async function getJobs(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            page = "1",
            limit = "20",
            company,
            jobType,
            status = "active",
            location,
            q,
            updated_after,
            sort = "posted_at_desc",
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(
            100,
            Math.max(1, parseInt(limit as string, 10))
        );
        const skip = (pageNum - 1) * limitNum;

        // 构建查询条件
        const where: FindOptionsWhere<Job> = {};

        if (company) {
            where.company = company as string;
        }

        if (jobType) {
            where.jobType = jobType as JobType;
        }

        if (status) {
            where.status = status as JobStatus;
        }

        // 构建排序
        type SortOrder = "ASC" | "DESC";
        let order: { [key: string]: SortOrder } = { postedAt: "DESC" };

        switch (sort) {
            case "posted_at_asc":
                order = { postedAt: "ASC" };
                break;
            case "updated_at_desc":
                order = { updatedAt: "DESC" };
                break;
            case "posted_at_desc":
            default:
                order = { postedAt: "DESC" };
        }

        // 使用 QueryBuilder 处理复杂查询
        const queryBuilder = jobRepository()
            .createQueryBuilder("job")
            .where(where);

        // 地点模糊搜索
        if (location) {
            queryBuilder.andWhere("job.location ILIKE :location", {
                location: `%${location}%`,
            });
        }

        // 关键词搜索（搜索标题和描述）
        if (q) {
            queryBuilder.andWhere(
                "(job.title ILIKE :q OR job.description ILIKE :q)",
                { q: `%${q}%` }
            );
        }

        // 更新时间筛选
        if (updated_after) {
            const date = new Date(updated_after as string);
            if (!isNaN(date.getTime())) {
                queryBuilder.andWhere("job.updatedAt > :updated_after", {
                    updated_after: date,
                });
            }
        }

        // 执行查询
        const [jobs, total] = await queryBuilder
            .orderBy(
                Object.keys(order)
                    .map((k) => `job.${k}`)
                    .join(", "),
                Object.values(order)[0]
            )
            .skip(skip)
            .take(limitNum)
            .getManyAndCount();

        // 返回结果（不包含 raw 字段以减少响应大小）
        const jobsWithoutRaw = jobs.map(({ raw, ...rest }) => rest);

        res.json({
            success: true,
            data: jobsWithoutRaw,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 获取单个岗位详情
 * GET /api/jobs/:id
 */
export async function getJobById(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { id } = req.params;

        const job = await jobRepository().findOne({
            where: { id },
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                error: "岗位不存在",
            });
        }

        res.json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 获取岗位统计
 * GET /api/jobs/stats
 */
export async function getJobStats(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        // 按公司统计
        const companyStats = await jobRepository()
            .createQueryBuilder("job")
            .select("job.company", "company")
            .addSelect("COUNT(*)", "count")
            .where("job.status = :status", { status: JobStatus.ACTIVE })
            .groupBy("job.company")
            .getRawMany();

        // 按类型统计
        const typeStats = await jobRepository()
            .createQueryBuilder("job")
            .select("job.jobType", "jobType")
            .addSelect("COUNT(*)", "count")
            .where("job.status = :status", { status: JobStatus.ACTIVE })
            .groupBy("job.jobType")
            .getRawMany();

        // 总数统计
        const total = await jobRepository().count({
            where: { status: JobStatus.ACTIVE },
        });

        res.json({
            success: true,
            data: {
                total,
                byCompany: companyStats,
                byType: typeStats,
            },
        });
    } catch (error) {
        next(error);
    }
}
