/// <reference types="@clerk/express/env" />

declare namespace Express {
  interface Request {
    user?: {
      id: string;
      role: "admin" | "user";
    };
  }
}