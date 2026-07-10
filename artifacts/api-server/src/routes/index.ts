import { Router, type IRouter } from "express";
import healthRouter from "./health";
import majorsRouter from "./majors";
import chatRouter from "./chat";
import meRouter from "./me";
import myCollegesRouter from "./myColleges";
import savedMajorsRouter from "./savedMajors";
import collegesRouter from "./colleges";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(majorsRouter);
router.use(chatRouter);
router.use(meRouter);
router.use(myCollegesRouter);
router.use(savedMajorsRouter);
router.use(collegesRouter);
router.use(adminRouter);

export default router;
