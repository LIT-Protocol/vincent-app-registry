import mongoose, { Document, Schema } from 'mongoose';

// App Schema
interface IApp extends Document {
  contactEmail: string;
  description: string;
  domain?: string;
  logo?: string;
  managementWallet: string;
  name: string;
}

const AppSchema: Schema = new mongoose.Schema(
  {
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
  description: string;
  lastUpdated: Date;
  managementWallet: string;
  name: string;
  roleId: string;
  toolPolicy: Array<{
    description?: string;
    policyVarsSchema: Array<{
      defaultValue: any;
      paramName: string;
      valueType: string;
    }>;
    toolIpfsCid: string;
  }>;
}

const RoleSchema: Schema = new mongoose.Schema(
  {
    description: { required: true, type: String },
    lastUpdated: { default: Date.now, type: Date },
    managementWallet: { required: true, type: String },
    name: { required: true, type: String },
    roleId: { required: true, type: String, unique: true },
    toolPolicy: [
      {
        description: { type: String },
        policyVarsSchema: [
          {
            defaultValue: { required: true, type: Schema.Types.Mixed },
            paramId: { required: true, type: String },
            paramName: { required: true, type: String },
            valueType: { required: true, type: String },
          },
        ],
        toolIpfsCid: { required: true, type: String },
      },
    ],
  },
  { timestamps: true }
);

export const App = mongoose.model<IApp>('App', AppSchema);
export const Role = mongoose.model<IRole>('Role', RoleSchema);
