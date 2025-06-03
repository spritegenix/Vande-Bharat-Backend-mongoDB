import { Request, Response, NextFunction } from 'express';

export function getCallerInfo(depth = 2): { file: string; line: number; column: number } | null {
  const stack = new Error().stack;
  if (!stack) return null;

  const lines = stack.split('\n');

  const callerLine = lines[depth] || '';
  const match = callerLine.match(/\((.*):(\d+):(\d+)\)/) || callerLine.match(/at (.*):(\d+):(\d+)/);
  if (!match) return null;

  const [, file, lineStr, colStr] = match;
  return {
    file,
    line: parseInt(lineStr, 10),
    column: parseInt(colStr, 10),
  };
}



export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const caller = getCallerInfo(3); // 👈 this depth is key
  if (caller) {
    console.log(
      `[${req.method}] ${req.originalUrl} | Invoked from: ${caller.file}:${caller.line}:${caller.column}`
    );
  }
  next();
};