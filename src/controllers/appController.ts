import { Request, Response } from 'express';
import { SiweMessage } from 'siwe';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { App, Role } from '../models/appModels';
import { verifySIWEMessage } from '../routes/siweVerification';

// Define Zod schemas for input validation
const registerAppSchema = z.object({
  contactEmail: z.string().email(),
  description: z.string(),
  name: z.string(),
  signedMessage: z.object({
    message: z.object({
      address: z.string(),
      chainId: z.number(),
      domain: z.string(),
      expirationTime: z.string().optional(),
      issuedAt: z.string(),
      nonce: z.string(),
      statement: z.string(),
      uri: z.string(),
      version: z.string(),
    }),
    signature: z.string(),
  }),
});

export const registerApp = async (req: Request, res: Response) => {
  try {
    const { contactEmail, description, name, signedMessage } = registerAppSchema.parse(req.body);

    let managementWallet: string;

    try {
      const siweMessage = new SiweMessage(signedMessage.message);
      managementWallet = await verifySIWEMessage({
        message: siweMessage,
        signature: signedMessage.signature,
      });
    } catch (error) {
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
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
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
  signedMessage: z.object({
    message: z.object({
      address: z.string(),
      chainId: z.number(),
      domain: z.string(),
      expirationTime: z.string().optional(),
      issuedAt: z.string(),
      nonce: z.string(),
      statement: z.string(),
      uri: z.string(),
      version: z.string(),
    }),
    signature: z.string(),
  }),
});

export const updateApp = async (req: Request, res: Response) => {
  try {
    const { contactEmail, description, name, signedMessage } = updateAppSchema.parse(req.body);

    let managementWallet: string;

    try {
      const siweMessage = new SiweMessage(signedMessage.message);
      managementWallet = await verifySIWEMessage({
        message: siweMessage,
        signature: signedMessage.signature,
      });
    } catch (error) {
      res.status(401).json({ message: (error as Error).message, success: false });
      return;
    }

    const app = await App.findOne({ managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found or unauthorized', success: false });
      return;
    }

    app.name = name;
    app.description = description;
    app.contactEmail = contactEmail;

    await app.save();

    res.json({ data: { app: app.toObject() }, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
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
      defaultValue: z.any(),
      paramName: z.string(),
      valueType: z.string(),
    })
  ),
  toolIpfsCid: z.string(),
});

const createRoleSchema = z.object({
  appId: z.string(),
  roleDescription: z.string(),
  roleName: z.string(),
  signedMessage: z.object({
    message: z.object({
      address: z.string(),
      chainId: z.number(),
      domain: z.string(),
      expirationTime: z.string().optional(),
      issuedAt: z.string(),
      nonce: z.string(),
      statement: z.string(),
      uri: z.string(),
      version: z.string(),
    }),
    signature: z.string(),
  }),
  toolPolicy: z.array(toolPolicySchema),
});

export const createRole = async (req: Request, res: Response) => {
  try {
    const { appId, roleDescription, roleName, signedMessage, toolPolicy } = createRoleSchema.parse(
      req.body
    );

    let managementWallet: string;

    try {
      const siweMessage = new SiweMessage(signedMessage.message);
      managementWallet = await verifySIWEMessage({
        message: siweMessage,
        signature: signedMessage.signature,
      });
    } catch (error) {
      res.status(401).json({ message: (error as Error).message, success: false });
      return;
    }

    const app = await App.findOne({ appId, managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found or unauthorized', success: false });
      return;
    }

    const roleId = uuidv4();
    const newRole = new Role({
      appId,
      roleId,
      description: roleDescription,
      lastUpdated: new Date(),
      name: roleName,
      toolPolicy: toolPolicy.map((tp) => ({
        policyVarsSchema: tp.policyVarsSchema.map((pvs) => ({
          defaultValue: pvs.defaultValue,
          paramName: pvs.paramName,
          valueType: pvs.valueType, // Ensure this is always present
        })),
        toolIpfsCid: tp.toolIpfsCid,
      })),
      version: 'init',
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
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const { appId, roleId } = req.params;
    const role = await Role.findOne({ appId, roleId });

    if (!role) {
      res.status(404).json({ message: 'Role not found', success: false });
      return;
    }

    res.json({
      data: {
        roleId: role.roleId,
        toolPolicy: role.toolPolicy.map((tp) => ({
          policyVarsSchema: tp.policyVarsSchema,
          toolIpfsCid: tp.toolIpfsCid,
        })),
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

const updateRoleSchema = z.object({
  appId: z.string(),
  roleDescription: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  signedMessage: z.object({
    message: z.object({
      address: z.string(),
      chainId: z.number(),
      domain: z.string(),
      expirationTime: z.string().optional(),
      issuedAt: z.string(),
      nonce: z.string(),
      statement: z.string(),
      uri: z.string(),
      version: z.string(),
    }),
    signature: z.string(),
  }),
  toolPolicy: z.array(toolPolicySchema),
});

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { appId, roleDescription, roleId, roleName, signedMessage, toolPolicy } =
      updateRoleSchema.parse(req.body);

    let managementWallet: string;

    try {
      const siweMessage = new SiweMessage(signedMessage.message);
      managementWallet = await verifySIWEMessage({
        message: siweMessage,
        signature: signedMessage.signature,
      });
    } catch (error) {
      res.status(401).json({ message: (error as Error).message, success: false });
      return;
    }

    const app = await App.findOne({ appId, managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found or unauthorized', success: false });
      return;
    }

    const role = await Role.findOne({ appId, roleId });
    if (!role) {
      res.status(404).json({ message: 'Role not found', success: false });
      return;
    }

    role.name = roleName;
    role.description = roleDescription;
    role.lastUpdated = new Date();
    role.toolPolicy = toolPolicy.map((tp) => ({
      policyId: uuidv4(),
      policyVarsSchema: tp.policyVarsSchema.map((pvs) => ({
        defaultValue: pvs.defaultValue,
        paramName: pvs.paramName,
        valueType: pvs.valueType, // Ensure this is always present
      })),
      toolIpfsCid: tp.toolIpfsCid,
    }));

    await role.save();

    res.json({
      data: { role: role.toObject() },
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

export const getAllRoles = async (req: Request, res: Response) => {
  try {
    // Define schema for query parameter validation
    const getAllRolesSchema = z.object({
      appId: z.string(),
    });

    // Parse and validate query parameters
    const { appId } = getAllRolesSchema.parse(req.query);

    // Find the app to ensure it exists
    const app = await App.findOne({ appId });
    if (!app) {
      res.status(404).json({ message: 'App not found', success: false });
      return;
    }

    // Fetch all roles for the given appId
    const roles = await Role.find({ appId });

    // If no roles exist, return empty array
    if (!roles || roles.length === 0) {
      res.json({
        data: [],
        success: true,
      });
      return;
    }

    // Format the response with role details
    const rolesData = roles.map((role) => ({
      lastUpdated: role.lastUpdated,
      roleDescription: role.description,
      roleId: role.roleId,
      roleName: role.name,
      toolPolicy: role.toolPolicy.map((tp) => ({
        policyVarsSchema: tp.policyVarsSchema,
        toolIpfsCid: tp.toolIpfsCid,
      })),
      version: role.version,
    }));

    res.json({
      data: rolesData,
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};
