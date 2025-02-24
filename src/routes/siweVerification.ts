import { SiweMessage } from 'siwe';

async function validateSIWEMessage(params: {
  message: SiweMessage;
  signature: string;
}): Promise<string> {
  const fields = {
    domain:
      process.env.DOMAIN ||
      process.env.HEROKU_APP_DEFAULT_DOMAIN_NAME ||
      `localhost:${process.env.PORT}`,
    nonce: params.message.nonce,
    signature: params.signature,
    time: params.message.issuedAt,
  };

  // Verify using the static verify method of SiweMessage
  const { error, success } = await params.message.verify(fields);

  if (!success) {
    // error is an Error in this case.
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw error;
  }

  if (!params.message.address) {
    throw new Error(
      'Missing "address" on SIWE message; this must be the management wallet address.'
    );
  }

  // Check expiration if present
  if (params.message.expirationTime) {
    const expirationTime = new Date(params.message.expirationTime);
    if (expirationTime < new Date()) {
      throw new Error(`message has expired: ${expirationTime.toISOString()} is in the past`);
    }
  }

  return params.message.address;
}

export async function verifySIWEMessage(params: {
  message: SiweMessage;
  signature: string;
}): Promise<string> {
  try {
    return await validateSIWEMessage(params);
  } catch (error) {
    throw new Error(`SIWE message verification failed: ${(error as unknown as Error).message}`);
  }
}
