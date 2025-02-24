import { Request, Response } from 'express';
import { SiweMessage } from 'siwe';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { App, Role } from '../models/appModels';

const generateUniqueId = () => uuidv4();

async function verifySIWEMessage(params: {
  message: SiweMessage;
  signature: string;
}): Promise<{ address: string }> {
  try {
    
    const fields = {
      domain: process.env.DOMAIN || 'localhost:3000',
      nonce: params.message.nonce,
      signature: params.signature,
      time: params.message.issuedAt,
    };

    // Verify using the static verify method of SiweMessage
    const { success } = await params.message.verify(fields);

    if (!success) {
      throw new Error('Signature verification failed');
    }

    // Check expiration if present
    if (params.message.expirationTime) {
      const expirationTime = new Date(params.message.expirationTime);
      if (expirationTime < new Date()) {
        throw new Error('Message has expired');
      }
    }

    return { address: params.message.address };
  } catch (error) {
    throw new Error('Invalid signature or message format');
  }
}

// Define Zod schemas for input validation
const registerAppSchema = z.object({
  appDescription: z.string(),
  appName: z.string(),
  email: z.string().email(),
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
    const { appDescription, appName, email, signedMessage } = registerAppSchema.parse(req.body);

    const siweMessage = new SiweMessage(signedMessage.message);
    const { address: managementWallet } = await verifySIWEMessage({
      message: siweMessage,
      signature: signedMessage.signature
    });

    // Check if the management wallet is already registered
    const existingApp = await App.findOne({ managementWallet });
    if (existingApp) {
      res.status(200).json({ message: 'Management wallet already registered', success: true });
      return;
    }
    const appId = generateUniqueId();
    const newApp = new App({
      appId,
      managementWallet,
      contactEmail: email,
      description: appDescription,
      name: appName,
    });

    await newApp.save();

    res.json({ data: { appId, appName }, success: true });
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
    const { appId } = req.params;
    const app = await App.findOne({ appId });

    if (!app) {
      res.status(404).json({ message: 'App not found', success: false });
      return;
    }

    res.json({
      data: {
        appId: app.appId,
        appName: app.name,
        logo: app.logo,
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

const updateAppSchema = z.object({
  appDescription: z.string(),
  appId: z.string(),
  appName: z.string(),
  email: z.string().email(),
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
    const { appDescription, appId, appName, email, signedMessage } = updateAppSchema.parse(
      req.body
    );

    // Verify SIWE message and extract management wallet address
    const siweMessage = new SiweMessage(signedMessage.message);
    const { address: managementWallet } = await verifySIWEMessage({
      message: siweMessage,
      signature: signedMessage.signature
    });

    const app = await App.findOne({ appId, managementWallet });
    if (!app) {
      res.status(404).json({ message: 'App not found or unauthorized', success: false });
      return;
    }

    app.name = appName;
    app.description = appDescription;
    app.contactEmail = email;

    await app.save();

    res.json({ data: { appId }, success: true });
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
  policyIpfsCid: z.string(),
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

    // Verify SIWE message and extract management wallet address
    const siweMessage = new SiweMessage(signedMessage.message);
    const { address: managementWallet } = await verifySIWEMessage({
      message: siweMessage,
      signature: signedMessage.signature
    });

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
        policyId: uuidv4(),
        policyIpfsCid: tp.policyIpfsCid,
        policyVarsSchema: tp.policyVarsSchema.map((pvs) => ({
          defaultValue: pvs.defaultValue,
          paramId: uuidv4(),
          paramName: pvs.paramName,
          valueType: pvs.valueType, // Ensure this is always present
        })),
        toolId: uuidv4(),
        toolIpfsCid: tp.toolIpfsCid,
      })),
      version: 'init',
    });

    await newRole.save();

    res.json({
      data: {
        appId,
        roleId,
        lastUpdated: newRole.lastUpdated,
        roleVersion: 'init',
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
        roleVersion: role.version,
        toolPolicy: role.toolPolicy.map((tp) => ({
          policy: {
            ipfsCid: tp.policyIpfsCid,
            policyId: tp.policyId,
            schema: tp.policyVarsSchema,
          },
          tool: {
            ipfsCid: tp.toolIpfsCid,
            toolId: tp.toolId,
          },
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
  roleVersion: z.string(),
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
    const { appId, roleDescription, roleId, roleName, roleVersion, signedMessage, toolPolicy } =
      updateRoleSchema.parse(req.body);

    // Verify SIWE message and extract management wallet address
    const siweMessage = new SiweMessage(signedMessage.message);
    const { address: managementWallet } = await verifySIWEMessage({
      message: siweMessage,
      signature: signedMessage.signature
    });

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
    role.version = roleVersion;
    role.lastUpdated = new Date();
    role.toolPolicy = toolPolicy.map((tp) => ({
      policyId: uuidv4(),
      policyIpfsCid: tp.policyIpfsCid,
      policyVarsSchema: tp.policyVarsSchema.map((pvs) => ({
        defaultValue: pvs.defaultValue,
        paramId: uuidv4(),
        paramName: pvs.paramName,
        valueType: pvs.valueType, // Ensure this is always present
      })),
      toolId: uuidv4(),
      toolIpfsCid: tp.toolIpfsCid,
    }));

    await role.save();

    res.json({
      data: {
        appId,
        roleId,
        roleVersion,
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
