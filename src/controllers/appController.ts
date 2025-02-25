import consola from 'consola';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { App, Role } from '../models/appModels';
import { verifySIWEMessage } from '../siwe/siweVerification';

// Define Zod schemas for input validation
const registerAppSchema = z.object({
  contactEmail: z.string().email(),
  description: z.string(),
  name: z.string(),
  signedMessage: z.string(),
});

export const registerApp = async (req: Request, res: Response) => {
  try {
    const { contactEmail, description, name, signedMessage } = registerAppSchema.parse(req.body);

    let managementWallet: string;

    try {
      managementWallet = await verifySIWEMessage(signedMessage);
    } catch (error) {
      consola.error('ERROR: ', (error as Error).message);
      res.status(401).json({ message: (error as Error).message, success: false });
      return;
    }

    // Check if the management wallet is already registered
    const existingApp = await App.findOne({ managementWallet });
    if (existingApp) {
      res.status(200).json({ message: 'Management wallet already registered', success: true });
      return;
    }
    const newApp = new App({
      contactEmail,
      description,
      managementWallet,
      name,
    });

    await newApp.save();

    res.json({ data: { app: newApp.toObject() }, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      consola.error('ERROR: ', JSON.stringify(error.errors));
      res.status(400).json({ message: JSON.stringify(error.errors), success: false });
      return;
    }
    consola.error('ERROR: ', (error as Error).message);

    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

export const getAppMetadata = async (req: Request, res: Response) => {
  try {
    const { managementWallet } = req.params;
    const app = await App.findOne({ managementWallet });

    if (!app) {
      res.status(404).json({ message: 'App not found', success: false });
      return;
    }

    res.json({
      data: app,
      success: true,
    });
  } catch (error) {
    consola.error('ERROR: ', (error as Error).message);

    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

const updateAppSchema = z.object({
  contactEmail: z.string().email(),
  description: z.string(),
  name: z.string(),
  signedMessage: z.string(),
});

export const updateApp = async (req: Request, res: Response) => {
  try {
    const { contactEmail, description, name, signedMessage } = updateAppSchema.parse(req.body);

    let managementWallet: string;

    try {
      managementWallet = await verifySIWEMessage(signedMessage);
    } catch (error) {
      res.status(401).json({ message: (error as Error).message, success: false });
      return;
    }
    const app = await App.findOne({ managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found', success: false });
      return;
    }

    app.name = name;
    app.description = description;
    app.contactEmail = contactEmail;

    await app.save();

    res.json({ data: { app: app.toObject() }, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      consola.error('ERROR: ', JSON.stringify(error.errors));

      res.status(400).json({ message: JSON.stringify(error.errors), success: false });
      return;
    }
    consola.error('ERROR: ', (error as Error).message);

    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

const toolPolicySchema = z.object({
  description: z.string().optional(),
  policyVarsSchema: z.array(
    z.object({
      defaultValue: z.string(),
      paramName: z.string(),
      valueType: z.string(),
    })
  ),
  toolIpfsCid: z.string(),
});

const createRoleSchema = z.object({
  description: z.string(),
  name: z.string(),
  signedMessage: z.string(),
  toolPolicy: z.array(toolPolicySchema),
});

export const createRole = async (req: Request, res: Response) => {
  try {
    const { description, name, signedMessage, toolPolicy } = createRoleSchema.parse(req.body);

    let managementWallet: string;

    try {
      managementWallet = await verifySIWEMessage(signedMessage);
    } catch (error) {
      res.status(401).json({ message: (error as Error).message, success: false });
      return;
    }

    const app = await App.findOne({ managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found or unauthorized', success: false });
      return;
    }

    const roleId = uuidv4();
    const newRole = new Role({
      description,
      name,
      roleId,
      managementWallet,
      lastUpdated: new Date(),
      toolPolicy: toolPolicy.map((tp) => ({
        policyVarsSchema: tp.policyVarsSchema.map((pvs) => ({
          defaultValue: pvs.defaultValue,
          paramName: pvs.paramName,
          valueType: pvs.valueType, // Ensure this is always present
        })),
        toolIpfsCid: tp.toolIpfsCid,
      })),
    });

    await newRole.save();

    res.json({
      data: {
        role: newRole.toObject(),
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      consola.error('ERROR: ', JSON.stringify(error.errors));

      res.status(400).json({ message: JSON.stringify(error.errors), success: false });
      return;
    }
    consola.error('ERROR: ', (error as Error).message);

    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const { managementWallet, roleId } = req.params;
    const role = await Role.findOne({ managementWallet, roleId });

    if (!role) {
      res.status(404).json({ message: 'Role not found', success: false });
      return;
    }

    res.json({
      data: {
        roleName: role.name,
        roleDescription: role.description,
        roleId: role.roleId,
        toolPolicy: role.toolPolicy.map((tp) => ({
          policyVarsSchema: tp.policyVarsSchema,
          toolIpfsCid: tp.toolIpfsCid,
        })),
      },
      success: true,
    });
  } catch (error) {
    consola.error('ERROR: ', (error as Error).message);

    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

const updateRoleSchema = z.object({
  description: z.string(),
  name: z.string(),
  roleId: z.string(),
  signedMessage: z.string(),
  toolPolicy: z.array(toolPolicySchema),
});

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { description, name, roleId, signedMessage, toolPolicy } = updateRoleSchema.parse(
      req.body
    );

    let managementWallet: string;

    try {
      managementWallet = await verifySIWEMessage(signedMessage);
    } catch (error) {
      res.status(401).json({ message: (error as Error).message, success: false });
      return;
    }

    const app = await App.findOne({ managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found or unauthorized', success: false });
      return;
    }

    const role = await Role.findOne({ managementWallet, roleId });
    if (!role) {
      res.status(404).json({ message: 'Role not found', success: false });
      return;
    }

    role.name = name;
    role.description = description;
    role.lastUpdated = new Date();
    role.toolPolicy = toolPolicy;

    await role.save();

    res.json({
      data: { role: role.toObject() },
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      consola.error('ERROR: ', JSON.stringify(error.errors));

      res.status(400).json({ message: JSON.stringify(error.errors), success: false });
      return;
    }
    consola.error('ERROR: ', (error as Error).message);

    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Define schema for query parameter validation
const getAllRolesSchema = z.object({
  managementWallet: z.string(),
});

export const getAllRoles = async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const { managementWallet } = getAllRolesSchema.parse(req.query);

    // Find the app to ensure it exists
    const app = await App.findOne({ managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found', success: false });
      return;
    }

    // Fetch all roles for the given appId
    const roles = await Role.find({ managementWallet });

    // If no roles exist, return empty array
    if (!roles || roles.length === 0) {
      res.json({
        data: [],
        success: true,
      });
      return;
    }

    res.json({
      data: { roles: roles.map((role) => role.toObject()) },
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      consola.error('ERROR: ', JSON.stringify(error.errors));

      res.status(400).json({ message: JSON.stringify(error.errors), success: false });
      return;
    }
    consola.error('ERROR: ', (error as Error).message);

    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};
