import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { App, registerAppSchema } from '../../models/appModels';
import { verifySIWEMessage } from '../../utils/siwe';

export const registerApp = async (req: Request, res: Response) => {
  try {
    const { appDescription, appName, email, signedMessage } = registerAppSchema.parse(req.body);

    // Verify SIWE message and extract management address
    const { address: managementAddress } = await verifySIWEMessage(signedMessage);

    // Generate a unique appId
    const appId = new Types.ObjectId().toString();

    // Create new app with unique appId
    const app = new App({
      appId,
      name: appName,
      description: appDescription,
      contactEmail: email,
      managementAddress: managementAddress.toLowerCase(),
      lastUpdated: new Date()
    });

    const savedApp = await app.save();

    res.json({
      success: true,
      data: {
        appId: savedApp.appId,
        appName: savedApp.name,
        logo: savedApp.logo
      }
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
    res.status(500).json({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false
    });
    return;
  }
}; 