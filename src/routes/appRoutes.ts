import cors from 'cors';
import { Router } from 'express';

import {
  registerApp,
  getAppMetadata,
  updateApp,
  createRole,
  getRole,
  updateRole,
  getAllRoles,
} from '../controllers/appController';

export const appRouter = Router();

const corsOptions = {
  optionsSuccessStatus: 200,
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedOrigins = [
      /^https?:\/\/localhost(:\d+)?$/, // localhost with any port
      // eslint-disable-next-line no-useless-escape
      new RegExp(`^https?:\/\/${process.env.DOMAIN}$`),
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
appRouter.post('/registerApp', registerApp);
appRouter.get('/appMetadata/:managementWallet', getAppMetadata);
appRouter.put('/updateApp', updateApp);
appRouter.post('/createRole', createRole);
appRouter.get('/role/:managementWallet/:roleId', getRole);
appRouter.put('/updateRole', updateRole);
appRouter.get('/getAllRoles', getAllRoles);
