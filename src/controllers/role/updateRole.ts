import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { App, Role, RoleVersion, Tool, ToolVersion, updateRoleSchema } from '../../models/appModels';
import { verifySIWEMessage } from '../../utils/siwe';

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { 
      appId, 
      roleDescription, 
      roleId, 
      roleName, 
      roleVersion: newVersion,
      signedMessage, 
      toolPolicy 
    } = updateRoleSchema.parse(req.body);

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

    // Find role and populate current version
    const role = await Role.findOne({ _id: roleId, app: app._id.toString() })
      .populate('activeRoleVersion')
      .exec();

    if (!role) {
      return res.status(404).json({ message: 'Role not found', success: false });
    }

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
        description: 'Updated tool version',
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

    // Create new role version
    const newRoleVersion = new RoleVersion({
      role: role._id.toString(),
      version: newVersion,
      tools: toolRefs
    });

    // Save new role version
    const savedRoleVersion = await newRoleVersion.save();

    // Update role metadata and active version
    role.name = roleName;
    role.description = roleDescription;
    role.activeRoleVersion = savedRoleVersion._id.toString();
    role.lastUpdated = new Date();
    await role.save();

    res.json({
      success: true,
      data: {
        appId,
        roleId: role._id.toString(),
        roleVersion: newVersion
      }
    });
  } catch (error) {
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