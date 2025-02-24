import { Request, Response } from 'express';
import { App, Role, RoleVersion, Tool, ToolVersion } from '../../models/appModels';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    // Find app first
    const app = await App.findOne({ appId });
    if (!app) {
      return res.status(404).json({ message: 'App not found', success: false });
    }

    // Find all roles for the app and populate their active versions
    const roles = await Role.find({ app: app._id.toString() })
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

    if (!roles.length) {
      return res.status(404).json({ message: 'No roles found for this app', success: false });
    }

    const rolesData = roles.map((role: any) => {
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

      return {
        roleId: role._id.toString(),
        name: role.name,
        description: role.description,
        enabled: role.enabled,
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
      };
    });

    res.json({
      success: true,
      data: rolesData
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false
    });
    return;
  }
}; 