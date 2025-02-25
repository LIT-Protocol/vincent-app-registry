import { SiweMessage, SiweError } from 'siwe';
import { z } from 'zod';

import { DOMAIN } from '../constants';

import type { json } from './jsonSchema';

const stringToJSONSchema = z.string().transform((str, ctx): z.infer<ReturnType<typeof json>> => {
  try {
    return JSON.parse(str);
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
});

const signedMessageSchema = z.object({
  message: z.string(), // NOT JSON -- a SIWE schema message from `prepareMessage(), which must be parsed by `SiweMessage`
  signature: z.string(),
});

async function validateSIWEMessage(rawSignedMessage: string): Promise<string> {
  const parsedSignedMessage = stringToJSONSchema.parse(rawSignedMessage);
  const { message, signature } = signedMessageSchema.parse(parsedSignedMessage);

  const siweMessage = new SiweMessage(message);

  // Verify using the static verify method of SiweMessage
  const { error, success } = await siweMessage.verify({
    signature,
    domain: DOMAIN,
  });

  if (!success) {
    // error is a SiweError Error in this case.
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw error;
  }

  return siweMessage.address;
}

export async function verifySIWEMessage(rawSignedMessage: string): Promise<string> {
  try {
    return await validateSIWEMessage(rawSignedMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }

    if (error instanceof SiweError) {
      throw new Error(`SIWE message verification failed: ${error.type}`);
    }

    let message = '';

    if (typeof error === 'object' && error !== null && 'message' in error) {
      message = error.message as string;
    } else {
      message = JSON.stringify(error);
    }

    throw new Error(`SIWE message verification failed: ${message}`);
  }
}
