import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { App, Role, RoleVersion, Tool, ToolVersion, createRoleSchema } from '../../models/appModels';
import { verifySIWEMessage } from '../../utils/siwe';

export const createRole = async (req: Request, res: Response) => {
  try {
    const { appId, roleDescription, roleName, signedMessage, toolPolicy } = createRoleSchema.parse(req.body);

    // Verify SIWE message and extract management address
    const { address: managementAddress } = await verifySIWEMessage(signedMessage);

    // Find app and verify management address
    const app = await App.findOne({ 
      appId,
      managementAddress: managementAddress.toLowerCase()
    });

    if (!app) {
      return res.status(404).json({ message: 'App not found or unauthorized', success: false });
    }

    // Create new role
    const role = new Role({
      name: roleName,
      description: roleDescription,
      app: app._id.toString(),
      enabled: true,
      lastUpdated: new Date()
    });

    // Create tools and their versions first
    const toolRefs = await Promise.all(toolPolicy.map(async (tp) => {
      // Create tool
      const tool = new Tool({
        name: `Tool for ${roleName}`,
        description: 'Tool created for role',
        app: app._id.toString(),
        enabled: true,
        lastUpdated: new Date()
      });

      // Create tool version
      const toolVersion = new ToolVersion({
        description: 'Initial tool version',
        toolIpfsCid: tp.toolIpfsCid,
        policyIpfsCid: tp.policyIpfsCid,
        policyParamsSchema: tp.policyVarsSchema.map(schema => ({
          paramName: schema.paramName,
          valueType: schema.valueType,
          defaultValue: schema.defaultValue
        })),
        version: 1,
        tool: tool._id.toString()
      });

      // Save tool version first
      const savedToolVersion = await toolVersion.save();

      // Update and save tool with its version
      tool.activeToolVersion = savedToolVersion._id.toString();
      const savedTool = await tool.save();

      return savedTool._id.toString();
    }));

    // Create role version
    const roleVersion = new RoleVersion({
      role: role._id.toString(),
      version: 1,
      tools: toolRefs
    });

    // Save role version first
    const savedRoleVersion = await roleVersion.save();

    // Update and save role with its version
    role.activeRoleVersion = savedRoleVersion._id.toString();
    const savedRole = await role.save();

    res.json({
      success: true,
      data: {
        roleId: savedRole._id.toString(),
        roleVersion: 1
      }
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false
    });
    return;
  }
}; 