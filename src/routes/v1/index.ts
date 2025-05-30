import { env } from "@/config/zodSafeEnv";
import { Request, Response, Router } from "express";
import userRoutes from "./user.routes";
import authRoutes from "./auth.routes";
import postRoutes from "./post.routes";
import mediaRoutes from "./media.routes";
import communityRoutes from "./community.routes";
import requestRoutes from "./request.routes";
import pageRoutes from './page.routes';


const router = Router();
// Clerk Web Hook
router.use("/internal", authRoutes);

// Media
router.use("/media", mediaRoutes);

// User
router.use("/users", userRoutes);

// Post
router.use("/posts", postRoutes);

// Community
router.use('/communities', communityRoutes);

// Page
router.use('/pages', pageRoutes);

// Request
router.use('/requests', requestRoutes);






router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});

export default router;
