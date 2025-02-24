import { Router, RequestHandler } from 'express';
import { registerApp } from '../controllers/app/registerApp';
import { getAppMetadata } from '../controllers/app/getAppMetadata';
import { updateApp } from '../controllers/app/updateApp';
import { createRole } from '../controllers/role/createRole';
import { getRole } from '../controllers/role/getRole';
import { updateRole } from '../controllers/role/updateRole';
import { getRoles } from '../controllers/role/getRoles';

const router = Router();

// App routes
router.post('/api/v1/registerApp', registerApp as RequestHandler);
router.get('/api/v1/appMetadata/:appId', getAppMetadata as RequestHandler);
router.put('/api/v1/updateApp', updateApp as RequestHandler);

// Role routes
router.post('/api/v1/createRole', createRole as RequestHandler);
router.get('/api/v1/role/:appId/:roleId', getRole as RequestHandler);
router.put('/api/v1/updateRole', updateRole as RequestHandler);
router.get('/api/v1/roles/:appId', getRoles as RequestHandler);

export const appRouter = router;
