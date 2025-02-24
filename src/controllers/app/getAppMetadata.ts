import { Request, Response } from 'express';
import { App } from '../../models/appModels';

export const getAppMetadata = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await App.findOne({ appId });

    if (!app) {
      return res.status(404).json({ message: 'App not found', success: false });
    }

    res.json({
      success: true,
      data: {
        appId: app.appId,
        appName: app.name,
        logo: app.logo
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