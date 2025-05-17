import express, { Application, Request, Response, NextFunction } from "express";
// import morgan from "morgan";
import cors from "cors";
// import helmet from "helmet";
// import compression from "compression";
// import cookieParser from "cookie-parser";
import { env } from "@/config/zodSafeEnv";
import connectDB from "@/config/db";
import errorHandler from "@/middlewares/error.middleware";
import routes from "@/routes"; // All combined route imports
import { clerkMiddleware } from '@clerk/express'
import { setupSwagger } from "./utils/swagger.utils";
import { apis } from "./constants";
const app: Application = express();

setupSwagger(app);
// Database Connection
connectDB();


// Middleware Stack
// app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'https://expectations-gun-singer-analysts.trycloudflare.com'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: any) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// app.use(compression());
// app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
// app.use(morgan("dev"));

// Clerk authentication middleware
app.use(clerkMiddleware())

// Health Check
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, apis: apis });
});

// API Routes
app.use("/api", routes);

// 404 handler
// app.all("*", (req: Request, _res: Response, next: NextFunction) => {
//   next(new ApiError(404, `Route not found`));
// });

// Global error handler
app.use(errorHandler);

export default app;
