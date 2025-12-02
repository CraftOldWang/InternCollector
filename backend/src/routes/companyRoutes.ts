import { Router } from "express";
import {
    getCompanies,
    getCompanyByCode,
} from "../controllers/companyController";

const router = Router();

// GET /api/companies - 获取公司列表
router.get("/", getCompanies);

// GET /api/companies/:code - 获取单个公司详情
router.get("/:code", getCompanyByCode);

export default router;
