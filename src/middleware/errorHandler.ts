import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { ZodError } from 'zod';
import AppError from '../lib/AppError.js';
import logger from '../lib/logger.js';

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({ message: 'Unique constraint failed' });
        break;
      case 'P2025':
        res.status(404).json({ message: 'Record not found' });
        break;
      default:
        res.status(500).json({ message: 'Database error' });
        break;
    }
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'Validation error', errors: err });
    return;
  }

  logger.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
};

export default errorHandler;
