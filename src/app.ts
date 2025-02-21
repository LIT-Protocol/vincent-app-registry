import consola from 'consola';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import { appRouter } from './routes/appRoutes';

const logger = consola.withTag('app init');

dotenv.config();
const app = express();
app.use(express.json());
app.use('/api/v1', appRouter);

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    logger.log('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => logger.error('MongoDB connection error:', err));
