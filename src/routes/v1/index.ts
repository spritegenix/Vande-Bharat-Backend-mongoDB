import { Request, Response, Router } from "express";
import userRoutes from "./user.routes";
import { env } from "@/config/zodSafeEnv";
import authRoutes from "./auth.routes";
import postRoutes from "./post.routes";

const router = Router();
// Clerk Web Hook
router.use("/internal", authRoutes);

router.use("/users", userRoutes);

// router.use("/posts", postRoutes);

router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV,  });
});

export default router;
