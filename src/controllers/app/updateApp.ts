import { Request, Response } from 'express';
import { z } from 'zod';
import { App, updateAppSchema } from '../../models/appModels';
import { verifySIWEMessage } from '../../utils/siwe';

export const updateApp = async (req: Request, res: Response) => {
  try {
    const { appDescription, appId, appName, email, signedMessage } = updateAppSchema.parse(req.body);

    // Verify SIWE message and extract management address
    const { address: managementAddress } = await verifySIWEMessage(signedMessage);

    // Find app and verify management address
    const app = await App.findOne({ 
      appId,
      managementAddress: managementAddress.toLowerCase()
    });

    if (!app) {
      return res.status(404).json({ message: 'App not found or unauthorized', success: false });
    }

    // Update app fields
    app.name = appName;
    app.description = appDescription;
    app.contactEmail = email;
    app.lastUpdated = new Date();

    await app.save();

    res.json({
      success: true,
      data: {
        appId: app.appId
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