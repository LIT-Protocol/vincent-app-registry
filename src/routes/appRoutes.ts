import cors from 'cors';
import { Router } from 'express';

import { DOMAIN } from '../constants';
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

    // FIXME: Don't allow localhost to hit production instances of this service.
    const allowedOrigins = [
      /^https?:\/\/localhost(:\d+)?$/, // localhost with any port
      // eslint-disable-next-line no-useless-escape
      new RegExp(`^https?:\/\/${DOMAIN}$`),
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
appRouter.post('/api/v1/registerApp', registerApp);
appRouter.get('/api/v1/appMetadata/:managementWallet', getAppMetadata);
appRouter.put('/api/v1/updateApp', updateApp);
appRouter.post('/api/v1/createRole', createRole);
appRouter.get('/api/v1/role/:managementWallet/:roleId', getRole);
appRouter.put('/api/v1/updateRole', updateRole);
appRouter.get('/api/v1/getAllRoles', getAllRoles);
