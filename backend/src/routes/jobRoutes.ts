import { Router } from "express";
import { getJobs, getJobById, getJobStats } from "../controllers/jobController";

const router = Router();

// GET /api/jobs - 获取岗位列表
router.get("/", getJobs);

// GET /api/jobs/stats - 获取岗位统计
router.get("/stats", getJobStats);

// GET /api/jobs/:id - 获取单个岗位详情
router.get("/:id", getJobById);

export default router;
