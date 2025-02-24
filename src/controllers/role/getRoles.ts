import { Request, Response } from 'express';
import { Role, RoleVersion } from '../../models/appModels';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    // Find all roles for the app and populate their active versions
    const roles = await Role.find({ app: appId })
      .populate({
        path: 'activeRoleVersion',
        model: RoleVersion,
        select: 'version tools'
      })
      .exec();

    if (!roles.length) {
      return res.status(404).json({ message: 'No roles found for this app', success: false });
    }

    const rolesData = roles.map(role => {
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

      return {
        roleId: role._id.toString(),
        name: role.name,
        description: role.description,
        enabled: role.enabled,
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