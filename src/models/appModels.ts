import mongoose, { Schema, Types } from 'mongoose';
import { z } from 'zod';

// Shared SIWE message schema used across multiple endpoints
export const siweMessageSchema = z.object({
  message: z.object({
    address: z.string(),
    chainId: z.number(),
    domain: z.string(),
    expirationTime: z.string().optional(),
    issuedAt: z.string(),
    nonce: z.string(),
    statement: z.string(),
    uri: z.string(),
    version: z.string(),
  }),
  signature: z.string(),
});

// Zod schemas for validation
export const registerAppSchema = z.object({
  appDescription: z.string(),
  appName: z.string(),
  email: z.string().email(),
  signedMessage: siweMessageSchema,
});

export const updateAppSchema = z.object({
  appDescription: z.string(),
  appId: z.string(),
  appName: z.string(),
  email: z.string().email(),
  signedMessage: siweMessageSchema,
});

export const toolPolicySchema = z.object({
  policyIpfsCid: z.string(),
  policyVarsSchema: z.array(
    z.object({
      defaultValue: z.any(),
      paramName: z.string(),
      valueType: z.string(),
    })
  ),
  toolIpfsCid: z.string(),
});

export const createRoleSchema = z.object({
  appId: z.string(),
  roleDescription: z.string(),
  roleName: z.string(),
  signedMessage: siweMessageSchema,
  toolPolicy: z.array(toolPolicySchema),
});

export const updateRoleSchema = z.object({
  appId: z.string(),
  roleDescription: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  roleVersion: z.string(),
  signedMessage: siweMessageSchema,
  toolPolicy: z.array(toolPolicySchema),
});

// Interfaces for TypeScript support (no Document extension)
export interface IApp {
  appId: string;
  contactEmail: string;
  description: string;
  domain?: string;
  lastUpdated: Date;
  logo?: string;
  name: string;
}

export interface IRole {
  activeRoleVersion: string; // ObjectId reference to RoleVersion
  app: string; // ObjectId reference to App
  description: string;
  enabled: boolean;
  lastUpdated: Date;
  name: string;
}

export interface IRoleVersion {
  role: string; // ObjectId reference to Role
  tools: string[]; // Array of ObjectId references to Tool
  version: number;
}

export interface ITool {
  activeToolVersion: string; // ObjectId reference to ToolVersion
  app: string; // ObjectId reference to App
  description: string;
  enabled: boolean;
  lastUpdated: Date;
  name: string;
}

export interface IToolVersion {
  description: string;
  policyIpfsCid: string;
  policyParamsSchema: Array<{
    defaultValue: unknown;
    paramName: string;
    valueType: string;
  }>;
  tool: string; // ObjectId reference to Tool
  toolIpfsCid: string;
  version: number;
}

// Schema for policy parameters
const PolicyParamSchema = new Schema({
  defaultValue: Schema.Types.Mixed,
  paramName: { required: true, type: String },
  valueType: { required: true, type: String }
}, { _id: false });

// App Schema
const AppSchema = new Schema<IApp>({
  appId: { required: true, type: String, unique: true },
  contactEmail: { required: true, type: String },
  description: { required: true, type: String },
  domain: { type: String },
  lastUpdated: { required: true, type: Date, default: Date.now },
  logo: { type: String },
  name: { required: true, type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Role Schema
const RoleSchema = new Schema<IRole>({
  activeRoleVersion: { required: true, type: String, ref: 'RoleVersion' },
  app: { required: true, type: String, ref: 'App' },
  description: { required: true, type: String },
  enabled: { required: true, type: Boolean, default: true },
  lastUpdated: { required: true, type: Date, default: Date.now },
  name: { required: true, type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// RoleVersion Schema
const RoleVersionSchema = new Schema<IRoleVersion>({
  role: { required: true, type: String, ref: 'Role' },
  tools: [{ required: true, type: String, ref: 'Tool' }],
  version: { required: true, type: Number }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tool Schema
const ToolSchema = new Schema<ITool>({
  activeToolVersion: { required: true, type: String, ref: 'ToolVersion' },
  app: { required: true, type: String, ref: 'App' },
  description: { required: true, type: String },
  enabled: { required: true, type: Boolean, default: true },
  lastUpdated: { required: true, type: Date, default: Date.now },
  name: { required: true, type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ToolVersion Schema
const ToolVersionSchema = new Schema<IToolVersion>({
  description: { required: true, type: String },
  policyIpfsCid: { required: true, type: String },
  policyParamsSchema: [{ required: true, type: PolicyParamSchema }],
  tool: { required: true, type: String, ref: 'Tool' },
  toolIpfsCid: { required: true, type: String },
  version: { required: true, type: Number }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create and export models
export const App = mongoose.model<IApp>('App', AppSchema);
export const Role = mongoose.model<IRole>('Role', RoleSchema);
export const RoleVersion = mongoose.model<IRoleVersion>('RoleVersion', RoleVersionSchema);
export const Tool = mongoose.model<ITool>('Tool', ToolSchema);
export const ToolVersion = mongoose.model<IToolVersion>('ToolVersion', ToolVersionSchema);
