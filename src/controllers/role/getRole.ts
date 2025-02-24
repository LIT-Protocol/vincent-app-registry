import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Role, RoleVersion } from '../../models/appModels';

export const getRole = async (req: Request, res: Response) => {
  try {
    const { appId, roleId } = req.params;

    // Validate roleId format
    if (!Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({ message: 'Invalid role ID format', success: false });
    }

    // Find role and populate its active version
    const role = await Role.findOne({ _id: roleId, app: appId })
      .populate({
        path: 'activeRoleVersion',
        model: RoleVersion,
        select: 'version tools'
      })
      .exec();

    if (!role) {
      return res.status(404).json({ message: 'Role not found', success: false });
    }

    // Type assertion for populated role version
    const roleVersion = role.activeRoleVersion as unknown as {
      version: string;
      tools: Array<{
        toolId: string;
        ipfsCid: string;
        policy: {
          policyId: string;
          ipfsCid: string;
          policyVarsSchema: Array<{
            paramId: string;
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
        roleVersion: roleVersion.version,
        toolPolicy: roleVersion.tools.map(tool => ({
          tool: {
            toolId: tool.toolId,
            ipfsCid: tool.ipfsCid,
          },
          policy: {
            policyId: tool.policy.policyId,
            ipfsCid: tool.policy.ipfsCid,
            schema: tool.policy.policyVarsSchema
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