import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    Unique,
} from "typeorm";

/**
 * 岗位状态枚举
 */
export enum JobStatus {
    ACTIVE = "active", // 正在招聘
    EXPIRED = "expired", // 已下架
    UNKNOWN = "unknown", // 状态未知
}

/**
 * 岗位类型枚举
 */
export enum JobType {
    INTERN = "intern", // 实习
    CAMPUS = "campus", // 校招
    SOCIAL = "social", // 社招
    UNKNOWN = "unknown",
}

/**
 * 岗位实体
 */
@Entity("jobs")
@Unique(["company", "postId"])
@Index(["company"])
@Index(["status"])
@Index(["postedAt"])
@Index(["jobType"])
export class Job {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /** 公司标识（如 bytedance, tencent） */
    @Column({ length: 50 })
    company!: string;

    /** 公司内部的岗位ID */
    @Column({ name: "post_id", length: 100 })
    postId!: string;

    /** 岗位标题 */
    @Column({ type: "text" })
    title!: string;

    /** 工作地点 */
    @Column({ type: "text", nullable: true })
    location?: string;

    /** 岗位描述 */
    @Column({ type: "text", nullable: true })
    description?: string;

    /** 岗位要求 */
    @Column({ type: "text", nullable: true })
    requirements?: string;

    /** 薪资信息 */
    @Column({ type: "text", nullable: true })
    salary?: string;

    /** 岗位类型（实习/校招/社招） */
    @Column({
        name: "job_type",
        type: "varchar",
        length: 20,
        default: JobType.INTERN,
    })
    jobType!: JobType;

    /** 职位类别（如：研发-后端、产品、运营） */
    @Column({ name: "category", type: "text", nullable: true })
    category?: string;

    /** 标签（如：Python, Java, 机器学习） */
    @Column({ type: "simple-array", nullable: true })
    tags?: string[];

    /** 岗位详情页链接 */
    @Column({ type: "text" })
    url!: string;

    /** 岗位状态 */
    @Column({
        type: "varchar",
        length: 20,
        default: JobStatus.ACTIVE,
    })
    status!: JobStatus;

    /** 岗位发布时间（来自源站） */
    @Column({ name: "posted_at", type: "timestamptz", nullable: true })
    postedAt?: Date;

    /** 最后一次抓取时间 */
    @Column({ name: "last_crawled_at", type: "timestamptz" })
    lastCrawledAt!: Date;

    /** 最后一次在抓取结果中出现的时间（用于判断下架） */
    @Column({ name: "last_seen_at", type: "timestamptz" })
    lastSeenAt!: Date;

    /** 内容哈希，用于检测变更 */
    @Column({ name: "content_hash", length: 64, nullable: true })
    contentHash?: string;

    /** 原始数据（JSON） */
    @Column({ type: "jsonb", nullable: true })
    raw?: Record<string, unknown>;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
