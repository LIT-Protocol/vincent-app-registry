import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { App, Role, RoleVersion, Tool, ToolVersion } from '../../models/appModels';

export const getRole = async (req: Request, res: Response) => {
  try {
    const { appId, roleId } = req.params;

    // Validate roleId format
    if (!Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({ message: 'Invalid role ID format', success: false });
    }

    // Find app first
    const app = await App.findOne({ appId });
    if (!app) {
      return res.status(404).json({ message: 'App not found', success: false });
    }

    // Find role and populate its active version and tools
    const role = await Role.findOne({ _id: roleId, app: app._id.toString() })
      .populate({
        path: 'activeRoleVersion',
        model: RoleVersion,
        populate: {
          path: 'tools',
          model: Tool,
          populate: {
            path: 'activeToolVersion',
            model: ToolVersion
          }
        }
      })
      .exec();

    if (!role) {
      return res.status(404).json({ message: 'Role not found', success: false });
    }

    // First cast to unknown, then to our expected type
    const roleVersion = (role.activeRoleVersion as unknown) as {
      version: number;
      tools: Array<{
        _id: string;
        activeToolVersion: {
          _id: string;
          toolIpfsCid: string;
          policyIpfsCid: string;
          policyParamsSchema: Array<{
            paramName: string;
            valueType: string;
            defaultValue: any;
          }>;
        };
      }>;
    };

    res.json({
      success: true,
      data: {
        roleId: role._id.toString(),
        roleVersion: roleVersion.version.toString(),
        toolPolicy: roleVersion.tools.map(tool => ({
          tool: {
            toolId: tool._id.toString(),
            ipfsCid: tool.activeToolVersion.toolIpfsCid,
          },
          policy: {
            policyId: tool.activeToolVersion._id.toString(),
            ipfsCid: tool.activeToolVersion.policyIpfsCid,
            schema: tool.activeToolVersion.policyParamsSchema
          }
        }))
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false
    });
    return;
  }
}; 