import app from "./app";
import { env } from "@/config/zodSafeEnv";

const PORT = env.PORT || 5000;

const server = app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (err: any) => {
  console.error("❌ Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});
