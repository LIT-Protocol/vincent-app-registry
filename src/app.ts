import express from 'express';
import mongoose from 'mongoose';
import consola from 'consola';
import { appRouter } from './routes/appRoutes';

const logger = consola.withTag('app init');

export const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/vincent-app-registry')
  .then(() => logger.log('Connected to MongoDB'))
  .catch((error) => logger.error('Failed to connect to MongoDB:', error));

// Use routes
app.use('/', appRouter);

// Only start the server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.log(`Server is running on port ${port}`);
  });
} 