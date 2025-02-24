import { SiweMessage } from 'siwe';

interface SignedMessage {
  message: {
    address: string;
    chainId: number;
    domain: string;
    expirationTime?: string;
    issuedAt: string;
    nonce: string;
    statement: string;
    uri: string;
    version: string;
  };
  signature: string;
}

export async function verifySIWEMessage(signedMessage: SignedMessage): Promise<{ address: string }> {
  try {
    const siweMessage = new SiweMessage(signedMessage.message);
    
    const fields = {
      domain: process.env.DOMAIN || 'localhost:3000',
      nonce: signedMessage.message.nonce,
      signature: signedMessage.signature,
      time: signedMessage.message.issuedAt,
    };

    // Verify using the static verify method of SiweMessage
    const { success } = await siweMessage.verify(fields);

    if (!success) {
      throw new Error('Signature verification failed');
    }

    // Check expiration if present
    if (signedMessage.message.expirationTime) {
      const expirationTime = new Date(signedMessage.message.expirationTime);
      if (expirationTime < new Date()) {
        throw new Error('Message has expired');
      }
    }

    return { address: signedMessage.message.address };
  } catch (error) {
    throw new Error('Invalid signature or message format');
  }
} 