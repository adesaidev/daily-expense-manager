import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import router from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Serve uploaded bill images as static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
