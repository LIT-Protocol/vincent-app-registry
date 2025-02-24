import { expect, use } from 'chai';
import chaiJsonSchema from 'chai-json-schema';
import request from 'supertest';
import { App, Role } from '../src/models/appModels';
import { setupTestDb, teardownTestDb } from './setup';
import { Types } from 'mongoose';
import consola from 'consola';
import { app } from '../src/app'; // We'll need to export the app from app.ts
import { generateSiweMessage, SiweMessageData } from '../src/utils/siwe'; // We'll need to create this helper
import { verifySIWEMessage } from '../src/utils/siwe'; // We'll need to create this helper

const logger = consola.withTag('api-test');
use(chaiJsonSchema);

describe('API Endpoint Tests', () => {
  let testAppId: string;
  let testRoleId: string;
  let testSiweMessage: SiweMessageData;
  let managementAddress: string;

  before(async () => {
    try {
      await teardownTestDb();
      await setupTestDb();
      // Clear collections
      await App.deleteMany({});
      await Role.deleteMany({});
      
      // Generate a test SIWE message
      testSiweMessage = await generateSiweMessage();
      // Extract management address from SIWE message
      const { address } = await verifySIWEMessage(testSiweMessage);
      managementAddress = address.toLowerCase();
      
      // Register test app
      const registerResponse = await request(app)
        .post('/api/v1/registerApp')
        .send({
          appName: 'Test App',
          appDescription: 'A test application',
          email: 'test@example.com',
          signedMessage: testSiweMessage
        });
      
      if (!registerResponse.body.success || !registerResponse.body.data.appId) {
        logger.error('App registration failed:', registerResponse.body);
        throw new Error('Failed to register test app');
      }
      
      testAppId = registerResponse.body.data.appId;
      logger.log('Test app created with ID:', testAppId);

      // Create test role
      const roleResponse = await request(app)
        .post('/api/v1/createRole')
        .send({
          appId: testAppId,
          roleName: 'Test Role',
          roleDescription: 'A test role',
          signedMessage: testSiweMessage,
          toolPolicy: [{
            toolIpfsCid: 'ipfs://test_tool_cid',
            policyIpfsCid: 'ipfs://test_policy_cid',
            policyVarsSchema: [{
              paramName: 'testParam',
              valueType: 'string',
              defaultValue: 'test'
            }]
          }]
        });

      logger.log('Role creation response:', roleResponse.body);
      
      if (!roleResponse.body.success || !roleResponse.body.data.roleId) {
        logger.error('Role creation failed. Status:', roleResponse.status);
        logger.error('Role creation response:', roleResponse.body);
        throw new Error('Failed to create test role');
      }

      testRoleId = roleResponse.body.data.roleId;
      logger.log('Test role created with ID:', testRoleId);
      
      logger.log('Test setup complete');
    } catch (error) {
      logger.error('Error in test setup:', error);
      throw error;
    }
  });

  describe('App Endpoints', () => {
    describe('POST /api/v1/registerApp', () => {
      it('should register another app successfully', async () => {
        const response = await request(app)
          .post('/api/v1/registerApp')
          .send({
            appName: 'Another Test App',
            appDescription: 'Another test application',
            email: 'test2@example.com',
            signedMessage: testSiweMessage
          });

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('appId');
        expect(response.body.data).to.have.property('appName', 'Another Test App');
      });

      it('should fail to register app with invalid data', async () => {
        const response = await request(app)
          .post('/api/v1/registerApp')
          .send({
            appName: 'Test App',
            // Missing required fields
          });

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
      });
    });

    describe('GET /api/v1/appMetadata/:appId', () => {
      it('should get app metadata successfully', async () => {
        const response = await request(app)
          .get(`/api/v1/appMetadata/${testAppId}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('appId', testAppId);
        expect(response.body.data).to.have.property('appName', 'Test App');
      });

      it('should return 404 for non-existent app', async () => {
        const response = await request(app)
          .get(`/api/v1/appMetadata/${new Types.ObjectId().toString()}`);

        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
      });
    });

    describe('PUT /api/v1/updateApp', () => {
      it('should update app successfully', async () => {
        const response = await request(app)
          .put('/api/v1/updateApp')
          .send({
            appId: testAppId,
            appName: 'Updated Test App',
            appDescription: 'An updated test application',
            email: 'updated@example.com',
            signedMessage: testSiweMessage
          });

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('appId', testAppId);
      });

      it('should fail to update non-existent app', async () => {
        const response = await request(app)
          .put('/api/v1/updateApp')
          .send({
            appId: new Types.ObjectId().toString(),
            appName: 'Updated Test App',
            appDescription: 'An updated test application',
            email: 'updated@example.com',
            signedMessage: testSiweMessage
          });

        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
      });
    });
  });

  describe('Role Endpoints', () => {
    describe('POST /api/v1/createRole', () => {
      it('should create a new role successfully', async () => {
        const response = await request(app)
          .post('/api/v1/createRole')
          .send({
            appId: testAppId,
            roleName: 'Another Test Role',
            roleDescription: 'Another test role',
            signedMessage: testSiweMessage,
            toolPolicy: [{
              toolIpfsCid: 'ipfs://another_test_tool_cid',
              policyIpfsCid: 'ipfs://another_test_policy_cid',
              policyVarsSchema: [{
                paramName: 'anotherTestParam',
                valueType: 'string',
                defaultValue: 'test'
              }]
            }]
          });

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('roleId');
        expect(response.body.data).to.have.property('roleVersion', '0.0.1');
      });

      it('should fail to create role for non-existent app', async () => {
        const response = await request(app)
          .post('/api/v1/createRole')
          .send({
            appId: new Types.ObjectId().toString(),
            roleName: 'Test Role',
            roleDescription: 'A test role',
            signedMessage: testSiweMessage,
            toolPolicy: [{
              toolIpfsCid: 'ipfs://test_tool_cid',
              policyIpfsCid: 'ipfs://test_policy_cid',
              policyVarsSchema: [{
                paramName: 'testParam',
                valueType: 'string',
                defaultValue: 'test'
              }]
            }]
          });

        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
      });
    });

    describe('GET /api/v1/role/:appId/:roleId', () => {
      it('should get role successfully', async () => {
        const response = await request(app)
          .get(`/api/v1/role/${testAppId}/${testRoleId}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('roleId', testRoleId);
        expect(response.body.data).to.have.property('roleVersion');
        expect(response.body.data).to.have.property('toolPolicy');
        expect(response.body.data.toolPolicy).to.be.an('array');
        expect(response.body.data.toolPolicy[0]).to.have.property('tool');
        expect(response.body.data.toolPolicy[0]).to.have.property('policy');
        expect(response.body.data.toolPolicy[0].tool).to.have.property('toolId');
        expect(response.body.data.toolPolicy[0].tool).to.have.property('ipfsCid');
        expect(response.body.data.toolPolicy[0].policy).to.have.property('policyId');
        expect(response.body.data.toolPolicy[0].policy).to.have.property('ipfsCid');
        expect(response.body.data.toolPolicy[0].policy).to.have.property('schema');
      });

      it('should return 404 for non-existent role', async () => {
        const response = await request(app)
          .get(`/api/v1/role/${testAppId}/${new Types.ObjectId().toString()}`);

        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
      });
    });

    describe('GET /api/v1/roles/:appId', () => {
      it('should get all roles for an app', async () => {
        const response = await request(app)
          .get(`/api/v1/roles/${testAppId}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.be.an('array');
        expect(response.body.data).to.have.lengthOf.at.least(1);
      });

      it('should return 404 for app with no roles', async () => {
        const response = await request(app)
          .get(`/api/v1/roles/${new Types.ObjectId().toString()}`);

        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
      });
    });

    describe('PUT /api/v1/updateRole', () => {
      it('should update role successfully', async () => {
        const response = await request(app)
          .put('/api/v1/updateRole')
          .send({
            appId: testAppId,
            roleDescription: 'Updated test role',
            roleId: testRoleId,
            roleName: 'Updated Test Role',
            roleVersion: '0.0.2',
            signedMessage: testSiweMessage,
            toolPolicy: [{
              toolIpfsCid: 'ipfs://updated_test_tool_cid',
              policyIpfsCid: 'ipfs://updated_test_policy_cid',
              policyVarsSchema: [{
                paramName: 'updatedTestParam',
                valueType: 'string',
                defaultValue: 'updated'
              }]
            }]
          });

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('roleId', testRoleId);
        expect(response.body.data).to.have.property('roleVersion', '0.0.2');
      });

      it('should fail to update non-existent role', async () => {
        const response = await request(app)
          .put('/api/v1/updateRole')
          .send({
            appId: testAppId,
            roleDescription: 'Updated test role',
            roleId: new Types.ObjectId().toString(),
            roleName: 'Updated Test Role',
            roleVersion: '0.0.2',
            signedMessage: testSiweMessage,
            toolPolicy: [{
              toolIpfsCid: 'ipfs://updated_test_tool_cid',
              policyIpfsCid: 'ipfs://updated_test_policy_cid',
              policyVarsSchema: [{
                paramName: 'updatedTestParam',
                valueType: 'string',
                defaultValue: 'updated'
              }]
            }]
          });

        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
      });
    });
  });
}); 