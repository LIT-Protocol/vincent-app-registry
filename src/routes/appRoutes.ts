import cors from 'cors';
import { Router, Request, Response, NextFunction } from 'express';

import {
  registerApp,
  getAppMetadata,
  updateApp,
  createRole,
  getRole,
  updateRole,
} from '../controllers/appController';

export const appRouter = Router();

type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const corsOptions = {
  optionsSuccessStatus: 200,
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      /^http:\/localhost(:\d+)?$/, // localhost with any port
      new RegExp(`^https?://(.+.)?${process.env.DOMAIN}$`), // Any subdomain (optional) of the configured domain
    ];
    if (allowedOrigins.some((regex) => regex.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// Apply CORS middleware to all routes in this router
appRouter.use(cors(corsOptions));

// Use the RequestHandler type to cast each controller function
appRouter.post('/registerApp', registerApp as RequestHandler);
appRouter.get('/appMetadata/:appId', getAppMetadata as RequestHandler);
appRouter.put('/updateApp', updateApp as RequestHandler);
appRouter.post('/createRole', createRole as RequestHandler);
appRouter.get('/role/:appId/:roleId', getRole as RequestHandler);
appRouter.put('/updateRole', updateRole as RequestHandler);
