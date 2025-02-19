import mongoose, { Document, Schema } from 'mongoose';

// App Schema
interface IApp extends Document {
  appId: string;
  managementWallet: string;
  name: string;
  description: string;
  domain?: string;
  logo?: string;
  contactEmail: string;
}

const AppSchema: Schema = new mongoose.Schema({
  appId: { type: String, required: true, unique: true },
  managementWallet: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  domain: { type: String },
  logo: { type: String },
  contactEmail: { type: String, required: true }
}, { timestamps: true });

// Role Schema
interface IRole extends Document {
  roleId: string;
  appId: string;
  name: string;
  description: string;
  version: string;
  lastUpdated: Date;
  toolPolicy: Array<{
    toolId: string;
    toolIpfsCid: string;
    policyId: string;
    policyIpfsCid: string;
    policyVarsSchema: Array<{
      paramId: string;
      paramName: string;
      valueType: string;
      defaultValue: any;
    }>;
  }>;
}

const RoleSchema: Schema = new mongoose.Schema({
  roleId: { type: String, required: true, unique: true },
  appId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  version: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
  toolPolicy: [{
    toolId: { type: String, required: true },
    toolIpfsCid: { type: String, required: true },
    policyId: { type: String, required: true },
    policyIpfsCid: { type: String, required: true },
    policyVarsSchema: [{
      paramId: { type: String, required: true },
      paramName: { type: String, required: true },
      valueType: { type: String, required: true },
      defaultValue: { type: Schema.Types.Mixed, required: true }
    }]
  }]
}, { timestamps: true });

export const App = mongoose.model<IApp>('App', AppSchema);
export const Role = mongoose.model<IRole>('Role', RoleSchema);

// We no longer need separate Tool and Policy models as they are now embedded in the Role model
