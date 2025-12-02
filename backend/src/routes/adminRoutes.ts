import { Router } from "express";
import { triggerCrawl } from "../controllers/adminController";

const router = Router();

// POST /api/admin/crawl/:company
router.post("/crawl/:company", triggerCrawl);

export default router;
