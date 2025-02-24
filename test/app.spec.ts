import { expect, use } from 'chai';
import chaiJsonSchema from 'chai-json-schema';
import axios, { AxiosError } from 'axios';
import { App, Role, Tool, ToolVersion, RoleVersion, IApp, IRole, ITool, IToolVersion, IRoleVersion } from '../src/models/appModels';
import consola from 'consola';
import { setupTestDb, teardownTestDb } from './setup';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

const logger = consola.withTag('test');
use(chaiJsonSchema);

describe('App Registry API Tests', () => {
  let mongoAppId: Types.ObjectId;
  let toolId: Types.ObjectId;
  let roleIds: string[] = [];
  let appId: string;

  before(async () => {
    try {
      // Teardown and reinitialize the test DB
      await teardownTestDb();
      await setupTestDb();
      // Clear all five collections
      await App.deleteMany({});
      await Role.deleteMany({});
      await Tool.deleteMany({});
      await ToolVersion.deleteMany({});
      await RoleVersion.deleteMany({});
      logger.log('Cleared existing data');
    } catch (error) {
      logger.error('Error in test setup:', error);
      throw error;
    }
  });

  describe('1. App Management', () => {
    describe('App Registration', () => {
      it('should register a new app', async () => {
        // Generate a unique appId as a string.
        appId = new Types.ObjectId().toString();
        const app = new App({
          appId,
          name: 'Test App',
          description: 'A test application',
          contactEmail: 'test@example.com',
          lastUpdated: new Date()
        });

        const savedApp = await app.save() as IApp & { _id: Types.ObjectId };
        expect(savedApp).to.not.be.null;
        expect(savedApp.name).to.equal('Test App');
        expect(savedApp.description).to.equal('A test application');
        expect(savedApp.contactEmail).to.equal('test@example.com');
        expect(savedApp.appId).to.equal(appId);
        mongoAppId = savedApp._id;
      });

      it('should fail to create app with missing required fields', async () => {
        try {
          const app = new App({
            name: 'Test App'
            // Missing required fields: appId, description, contactEmail, etc.
          });
          await app.save();
          throw new Error('Expected validation to fail');
        } catch (error) {
          expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
        }
      });
    });

    describe('App Updates', () => {
      it('should successfully update an existing app', async () => {
        const updatedName = 'Updated Test App';
        const updatedDescription = 'An updated test application';
        const updatedEmail = 'updated@example.com';

        const updatedApp = await App.findByIdAndUpdate(
          mongoAppId,
          {
            name: updatedName,
            description: updatedDescription,
            contactEmail: updatedEmail,
            lastUpdated: new Date()
          },
          { new: true }
        );

        expect(updatedApp).to.not.be.null;
        expect(updatedApp?.name).to.equal(updatedName);
        expect(updatedApp?.description).to.equal(updatedDescription);
        expect(updatedApp?.contactEmail).to.equal(updatedEmail);
      });
    });
  });

  describe('2. Role Management', () => {
    before(async () => {
      try {
        // Step 1: Create a test Tool.
        // Provide a dummy activeToolVersion so that the required field is satisfied.
        const tool = new Tool({
          name: 'Test Tool',
          description: 'Test tool for roles',
          app: mongoAppId.toString(),
          enabled: true,
          lastUpdated: new Date(),
          activeToolVersion: new Types.ObjectId().toString() // Dummy value; will update later.
        });

        const savedTool = await tool.save() as ITool & { _id: Types.ObjectId };
        toolId = savedTool._id;
        logger.log('Created tool:', savedTool);

        // Step 2: Create a test ToolVersion with the required tool reference.
        const toolVersion = new ToolVersion({
          description: 'Test tool version',
          policyIpfsCid: 'test_policy_cid',
          toolIpfsCid: 'test_tool_cid',
          version: 1,
          policyParamsSchema: [{
            paramName: 'testParam',
            valueType: 'string',
            defaultValue: 'test'
          }],
          tool: savedTool._id.toString()
        });

        const savedToolVersion = await toolVersion.save() as IToolVersion & { _id: Types.ObjectId };
        logger.log('Created tool version:', savedToolVersion);

        // Step 3: Update the Tool with its activeToolVersion.
        await Tool.findByIdAndUpdate(toolId, {
          activeToolVersion: savedToolVersion._id.toString()
        });
        logger.log('Updated tool with version reference');

        // Step 4: Create multiple roles for testing.
        // Create roles first with a dummy activeRoleVersion.
        const rolesData = ['Admin', 'User', 'Guest'].map(name => ({
          name: `Test ${name} Role`,
          description: `A test ${name.toLowerCase()} role`,
          app: mongoAppId.toString(),
          enabled: true,
          lastUpdated: new Date(),
          activeRoleVersion: new Types.ObjectId().toString() // Dummy value.
        }));

        const createdRoles = await Promise.all(rolesData.map(async (data) => {
          const role = new Role(data);
          return role.save() as Promise<IRole & { _id: Types.ObjectId }>;
        }));

        // For each created role, create a RoleVersion using the role's _id and update the role.
        for (const role of createdRoles) {
          const roleVersion = new RoleVersion({
            role: role._id.toString(), // Provide the required role reference.
            tools: [toolId.toString()],
            version: 1
          });
          const savedRoleVersion = await roleVersion.save() as IRoleVersion & { _id: Types.ObjectId };
          await Role.findByIdAndUpdate(role._id, { activeRoleVersion: savedRoleVersion._id.toString() });
          roleIds.push(role._id.toString());
        }
        logger.log('Created test roles:', roleIds);
      } catch (error) {
        logger.error('Error in role setup:', error);
        throw error;
      }
    });

    describe('Role Creation', () => {
      it('should create a new role', async () => {
        // Create a RoleVersion first.
        const roleVersion = new RoleVersion({
          role: new Types.ObjectId().toString(), // Temporary dummy value.
          tools: [toolId.toString()],
          version: 1
        });
        const savedRoleVersion = await roleVersion.save() as IRoleVersion & { _id: Types.ObjectId };

        // Create the Role.
        const role = new Role({
          name: 'Test New Role',
          description: 'A newly created test role',
          app: mongoAppId.toString(),
          enabled: true,
          lastUpdated: new Date(),
          activeRoleVersion: savedRoleVersion._id.toString()
        });

        const savedRole = await role.save() as IRole & { _id: Types.ObjectId };
        expect(savedRole).to.not.be.null;
        expect(savedRole.name).to.equal('Test New Role');
        expect(savedRole.description).to.equal('A newly created test role');
        expect(savedRole.enabled).to.be.true;
        expect(savedRole.app).to.equal(mongoAppId.toString());
        expect(savedRole.activeRoleVersion).to.equal(savedRoleVersion._id.toString());

        // Update the RoleVersion with the Role reference.
        await RoleVersion.findByIdAndUpdate(savedRoleVersion._id, {
          role: savedRole._id.toString()
        });

        const updatedRoleVersion = await RoleVersion.findById(savedRoleVersion._id);
        expect(updatedRoleVersion?.role).to.equal(savedRole._id.toString());
      });

      it('should fail to create role without required fields', async () => {
        try {
          const role = new Role({
            name: 'Invalid Role'
            // Missing required fields: description, app, activeRoleVersion, etc.
          });
          await role.save();
          throw new Error('Expected validation to fail');
        } catch (error) {
          expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
          const validationError = error as mongoose.Error.ValidationError;
          expect(validationError.errors).to.have.property('app');
          expect(validationError.errors).to.have.property('description');
          expect(validationError.errors).to.have.property('activeRoleVersion');
        }
      });

      it('should create role with invalid references because Mongoose does not validate existence by default', async () => {
        // Since Mongoose only checks that the references are strings (and not that they exist),
        // this role will be saved even if the references are non-existent.
        const role = new Role({
          name: 'Invalid Role',
          description: 'Role with invalid references',
          app: new Types.ObjectId().toString(), // Non-existent app, but valid string.
          enabled: true,
          lastUpdated: new Date(),
          activeRoleVersion: new Types.ObjectId().toString() // Non-existent role version.
        });
        const savedRole = await role.save();
        expect(savedRole).to.not.be.null;
        expect(savedRole.app).to.be.a('string');
        expect(savedRole.activeRoleVersion).to.be.a('string');
      });
    });

    describe('Role Information', () => {
      it('should get role by ID', async () => {
        for (const roleId of roleIds) {
          const role = await Role.findById(roleId);
          expect(role).to.not.be.null;
          expect(role?.name).to.match(/Test (Admin|User|Guest) Role/);
          expect(role?.enabled).to.be.true;
          expect(role?.app).to.equal(mongoAppId.toString());
        }
      });
    });

    describe('Role Updates', () => {
      it('should update role metadata', async () => {
        const roleId = roleIds[0];
        const updatedRole = await Role.findByIdAndUpdate(
          roleId,
          {
            name: 'Updated Role',
            description: 'An updated role description',
            enabled: true,
            lastUpdated: new Date()
          },
          { new: true }
        );

        expect(updatedRole).to.not.be.null;
        expect(updatedRole?.name).to.equal('Updated Role');
        expect(updatedRole?.description).to.equal('An updated role description');
        expect(updatedRole?.enabled).to.be.true;
      });
    });
  });

  after(async () => {
    try {
      // Optionally close the Mongoose connection:
      await mongoose.connection.close();
      logger.log('Closed Mongoose connection');
    } catch (error) {
      logger.error('Error during teardown:', error);
      throw error;
    }
  });
});
