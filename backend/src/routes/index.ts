import { Router } from "express";
import jobRoutes from "./jobRoutes";
import companyRoutes from "./companyRoutes";

const router = Router();

router.use("/jobs", jobRoutes);
router.use("/companies", companyRoutes);

// 健康检查
router.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
