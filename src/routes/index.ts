import { Request, Response, Router } from "express";
import v1Routes from "./v1";
import { env } from "@/config/zodSafeEnv";

const router = Router();

router.use("/v1", v1Routes);

router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV });
});

export default router;
