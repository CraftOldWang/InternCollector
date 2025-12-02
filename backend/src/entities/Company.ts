import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";

/**
 * 公司信息实体
 */
@Entity("companies")
export class Company {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /** 公司标识（如 bytedance） */
    @Column({ length: 50, unique: true })
    code!: string;

    /** 公司名称 */
    @Column({ length: 100 })
    name!: string;

    /** 公司中文名 */
    @Column({ name: "name_cn", length: 100, nullable: true })
    nameCn?: string;

    /** 公司 Logo URL */
    @Column({ type: "text", nullable: true })
    logo?: string;

    /** 公司官网 */
    @Column({ type: "text", nullable: true })
    website?: string;

    /** 招聘页面 URL */
    @Column({ name: "careers_url", type: "text", nullable: true })
    careersUrl?: string;

    /** 是否启用爬取 */
    @Column({ default: true })
    enabled!: boolean;

    /** 上次爬取时间 */
    @Column({ name: "last_crawled_at", type: "timestamptz", nullable: true })
    lastCrawledAt?: Date;

    /** 爬取间隔（小时） */
    @Column({ name: "crawl_interval_hours", default: 6 })
    crawlIntervalHours!: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
