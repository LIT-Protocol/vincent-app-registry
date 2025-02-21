import mongoose, { Document, Schema } from 'mongoose';

// App Schema
interface IApp extends Document {
  appId: string;
  contactEmail: string;
  description: string;
  domain?: string;
  logo?: string;
  managementWallet: string;
  name: string;
}

const AppSchema: Schema = new mongoose.Schema(
  {
    appId: { required: true, type: String, unique: true },
    contactEmail: { required: true, type: String },
    description: { required: true, type: String },
    domain: { type: String },
    logo: { type: String },
    managementWallet: { required: true, type: String, unique: true },
    name: { required: true, type: String },
  },
  { timestamps: true }
);

// Role Schema
interface IRole extends Document {
  appId: string;
  description: string;
  lastUpdated: Date;
  name: string;
  roleId: string;
  toolPolicy: Array<{
    policyId: string;
    policyIpfsCid: string;
    policyVarsSchema: Array<{
      defaultValue: any;
      paramId: string;
      paramName: string;
      valueType: string;
    }>;
    toolId: string;
    toolIpfsCid: string;
  }>;
  version: string;
}

const RoleSchema: Schema = new mongoose.Schema(
  {
    appId: { required: true, type: String },
    description: { required: true, type: String },
    lastUpdated: { default: Date.now, type: Date },
    name: { required: true, type: String },
    roleId: { required: true, type: String, unique: true },
    toolPolicy: [
      {
        policyId: { required: true, type: String },
        policyIpfsCid: { required: true, type: String },
        policyVarsSchema: [
          {
            defaultValue: { required: true, type: Schema.Types.Mixed },
            paramId: { required: true, type: String },
            paramName: { required: true, type: String },
            valueType: { required: true, type: String },
          },
        ],
        toolId: { required: true, type: String },
        toolIpfsCid: { required: true, type: String },
      },
    ],
    version: { required: true, type: String },
  },
  { timestamps: true }
);

export const App = mongoose.model<IApp>('App', AppSchema);
export const Role = mongoose.model<IRole>('Role', RoleSchema);
