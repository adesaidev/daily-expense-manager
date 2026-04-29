import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error', error: err.message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}
