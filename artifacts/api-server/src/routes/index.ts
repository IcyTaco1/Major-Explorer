import { Router, type IRouter } from "express";
import healthRouter from "./health";
import majorsRouter from "./majors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(majorsRouter);

export default router;
