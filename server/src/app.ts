import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL ?? '*' }));
app.use(morgan('dev'));
app.use(express.json());

// Note: /uploads won't persist on Vercel — migrate to cloud storage (Cloudinary/S3) for production
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes
app.use('/api', router);

// API error handler
app.use(errorHandler);

// Serve React build (production)
const clientDist = path.join(process.cwd(), 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback — all non-API routes serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

export default app;
