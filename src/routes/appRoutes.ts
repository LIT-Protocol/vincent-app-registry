import { Router } from 'express';

import {
  registerApp,
  getAppMetadata,
  updateApp,
  createRole,
  getRole,
  updateRole,
} from '../controllers/appController';

export const appRouter = Router();

// Define a type for the request handler
// type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Use the RequestHandler type to cast each controller function
appRouter.post('/registerApp', registerApp);
appRouter.get('/appMetadata/:appId', getAppMetadata);
appRouter.put('/updateApp', updateApp);
appRouter.post('/createRole', createRole);
appRouter.get('/role/:appId/:roleId', getRole);
appRouter.put('/updateRole', updateRole);
