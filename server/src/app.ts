import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import router from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL ?? '*' }));
app.use(morgan('dev'));
app.use(express.json());

// Note: /uploads won't persist on Vercel serverless — use cloud storage (e.g. Cloudinary) for production images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);

export default app;
