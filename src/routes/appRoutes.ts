import { Router, Request, Response, NextFunction } from 'express';
import { registerApp, getAppMetadata, updateApp, createRole, getRole, updateRole } from '../controllers/appController';

export const appRouter = Router();

// Define a type for the request handler
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Use the RequestHandler type to cast each controller function
appRouter.post('/registerApp', registerApp as RequestHandler);
appRouter.get('/appMetadata/:appId', getAppMetadata as RequestHandler);
appRouter.put('/updateApp', updateApp as RequestHandler);
appRouter.post('/createRole', createRole as RequestHandler);
appRouter.get('/role/:appId/:roleId', getRole as RequestHandler);
appRouter.put('/updateRole', updateRole as RequestHandler);
