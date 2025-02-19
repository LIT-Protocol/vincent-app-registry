import { Request, Response } from 'express';
import { z } from 'zod';
import { App, Role } from '../models/appModels';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';

// Utility function to generate unique IDs
const generateUniqueId = () => uuidv4();
/*
import { SiweMessage } from 'siwe';

const verifySIWEMessage = async (signedMessage: string): Promise<{ address: string }> => {
  try {
    const siweMessage = new SiweMessage(signedMessage);
    const fields = await siweMessage.validate();
    return { address: fields.address };
  } catch (error) {
    console.error('SIWE verification failed:', error);
    throw new Error('Invalid signature');
  }
};
*/
// Utility function to verify SIWE message (placeholder)
const verifySIWEMessage = async (signedMessage: string): Promise<{ address: string }> => {
  // Implement SIWE verification logic here
  // For now, we'll just return a dummy address
  return { address: '0x1234567890123456789012345678901234567890' };
};

// Define Zod schemas for input validation
const registerAppSchema = z.object({
  signedMessage: z.string(),
  appName: z.string(),
  appDescription: z.string(),
  email: z.string().email()
});

export const registerApp = async (req: Request, res: Response) => {
  try {
    const { signedMessage, appName, appDescription, email } = registerAppSchema.parse(req.body);
    
    // Verify SIWE message and extract management wallet address
    const { address: managementWallet } = await verifySIWEMessage(signedMessage);

    // Check if the management wallet is already registered
    const existingApp = await App.findOne({ managementWallet });
    if (existingApp) {
      return res.status(400).json({ success: false, message: 'Management wallet already registered' });
    }

    const appId = generateUniqueId();
    const newApp = new App({
      appId,
      name: appName,
      description: appDescription,
      managementWallet,
      contactEmail: email
    });

    await newApp.save();

    res.json({ success: true, data: { appId, appName } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};

export const getAppMetadata = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await App.findOne({ appId });

    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }

    res.json({
      success: true,
      data: {
        appId: app.appId,
        appName: app.name,
        logo: app.logo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};

const updateAppSchema = z.object({
  signedMessage: z.string(),
  appId: z.string(),
  appName: z.string(),
  appDescription: z.string(),
  email: z.string().email()
});

export const updateApp = async (req: Request, res: Response) => {
  try {
    const { signedMessage, appId, appName, appDescription, email } = updateAppSchema.parse(req.body);

    // Verify SIWE message and extract management wallet address
    const { address: managementWallet } = await verifySIWEMessage(signedMessage);

    const app = await App.findOne({ appId, managementWallet });
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found or unauthorized' });
    }

    app.name = appName;
    app.description = appDescription;
    app.contactEmail = email;

    await app.save();

    res.json({ success: true, data: { appId } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};

const toolPolicySchema = z.object({
  toolIpfsCid: z.string(),
  policyIpfsCid: z.string(),
  policyVarsSchema: z.array(z.object({
    paramName: z.string(),
    valueType: z.string(),
    defaultValue: z.any()
  }))
});

const createRoleSchema = z.object({
  signedMessage: z.string(),
  appId: z.string(),
  roleName: z.string(),
  roleDescription: z.string(),
  toolPolicy: z.array(toolPolicySchema)
});

export const createRole = async (req: Request, res: Response) => {
  try {
    const { signedMessage, appId, roleName, roleDescription, toolPolicy } = createRoleSchema.parse(req.body);

    // Verify SIWE message and extract management wallet address
    const { address: managementWallet } = await verifySIWEMessage(signedMessage);

    const app = await App.findOne({ appId, managementWallet });
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found or unauthorized' });
    }

    const roleId = uuidv4();
    const newRole = new Role({
      roleId,
      appId,
      name: roleName,
      description: roleDescription,
      version: 'init',
      lastUpdated: new Date(),
      toolPolicy: toolPolicy.map(tp => ({
        toolId: uuidv4(),
        toolIpfsCid: tp.toolIpfsCid,
        policyId: uuidv4(),
        policyIpfsCid: tp.policyIpfsCid,
        policyVarsSchema: tp.policyVarsSchema.map(pvs => ({
          paramId: uuidv4(),
          paramName: pvs.paramName,
          valueType: pvs.valueType,
          defaultValue: pvs.defaultValue // Ensure this is always present
        }))
      }))
    });

    await newRole.save();

    res.json({
      success: true,
      data: {
        appId,
        roleId,
        roleVersion: 'init',
        lastUpdated: newRole.lastUpdated
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const { appId, roleId } = req.params;
    const role = await Role.findOne({ appId, roleId });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({
      success: true,
      data: {
        roleId: role.roleId,
        roleVersion: role.version,
        toolPolicy: role.toolPolicy.map(tp => ({
          tool: {
            toolId: tp.toolId,
            ipfsCid: tp.toolIpfsCid
          },
          policy: {
            policyId: tp.policyId,
            ipfsCid: tp.policyIpfsCid,
            schema: tp.policyVarsSchema
          }
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};

const updateRoleSchema = z.object({
  signedMessage: z.string(),
  appId: z.string(),
  roleId: z.string(),
  roleVersion: z.string(),
  roleName: z.string(),
  roleDescription: z.string(),
  toolPolicy: z.array(toolPolicySchema)
});

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { signedMessage, appId, roleId, roleVersion, roleName, roleDescription, toolPolicy } = updateRoleSchema.parse(req.body);

    // Verify SIWE message and extract management wallet address
    const { address: managementWallet } = await verifySIWEMessage(signedMessage);

    const app = await App.findOne({ appId, managementWallet });
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found or unauthorized' });
    }

    const role = await Role.findOne({ appId, roleId });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    role.name = roleName;
    role.description = roleDescription;
    role.version = roleVersion;
    role.lastUpdated = new Date();
    role.toolPolicy = toolPolicy.map(tp => ({
      toolId: uuidv4(),
      toolIpfsCid: tp.toolIpfsCid,
      policyId: uuidv4(),
      policyIpfsCid: tp.policyIpfsCid,
      policyVarsSchema: tp.policyVarsSchema.map(pvs => ({
        paramId: uuidv4(),
        paramName: pvs.paramName,
        valueType: pvs.valueType,
        defaultValue: pvs.defaultValue // Ensure this is always present
      }))
    }));

    await role.save();

    res.json({
      success: true,
      data: {
        appId,
        roleId,
        roleVersion
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};
