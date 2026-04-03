import { Router, type IRouter } from "express";
import healthRouter from "./health";
import majorsRouter from "./majors";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(majorsRouter);
router.use(chatRouter);

export default router;
