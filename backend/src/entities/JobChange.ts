import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Job } from "./Job";

/**
 * 变更类型枚举
 */
export enum ChangeType {
    CREATED = "created",
    UPDATED = "updated",
    REMOVED = "removed",
}

/**
 * 岗位变更记录实体
 */
@Entity("job_changes")
export class JobChange {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /** 关联的岗位 */
    @ManyToOne(() => Job, { onDelete: "CASCADE" })
    @JoinColumn({ name: "job_id" })
    job!: Job;

    @Column({ name: "job_id" })
    jobId!: string;

    /** 变更类型 */
    @Column({
        name: "change_type",
        type: "varchar",
        length: 20,
    })
    changeType!: ChangeType;

    /** 变更的字段差异 */
    @Column({ type: "jsonb", nullable: true })
    diff?: Record<string, { old: unknown; new: unknown }>;

    /** 变更时的快照 */
    @Column({ type: "jsonb", nullable: true })
    snapshot?: Record<string, unknown>;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;
}
