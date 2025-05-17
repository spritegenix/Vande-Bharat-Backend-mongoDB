import dotenv from "dotenv";
import { z } from "zod";

// Load .env file contents into process.env
dotenv.config();

// Define schema using Zod
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().url({ message: "DATABASE_URL must be a valid URL" }),
  CORS_ORIGIN: z.string().default("*"),

  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY is required"),

  STORAGE_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_AWS_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_AWS_S3_BUCKET_NAME: z.string().optional(),
  STORAGE_AWS_REGION: z.string().default("ap-south-1"),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:");
  console.table(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
