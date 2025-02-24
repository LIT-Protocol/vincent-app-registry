import { v4 as uuidv4 } from 'uuid';
import { SiweMessage } from 'siwe';
// Utility function to generate unique IDs
export const generateUniqueId = () => uuidv4();

// Utility function to verify SIWE message (placeholder)
export const verifySIWEMessage = async (params: {
  message: SiweMessage;
  signature: string;
}): Promise<{ address: string }> => {
  try {
    
    const fields = {
      domain: process.env.DOMAIN || 'localhost:3000',
      nonce: params.message.nonce,
      signature: params.signature,
      time: params.message.issuedAt,
    };

    // Verify using the static verify method of SiweMessage
    const { success } = await params.message.verify(fields);

    if (!success) {
      throw new Error('Signature verification failed');
    }

    // Check expiration if present
    if (params.message.expirationTime) {
      const expirationTime = new Date(params.message.expirationTime);
      if (expirationTime < new Date()) {
        throw new Error('Message has expired');
      }
    }

    return { address: params.message.address };
  } catch (error) {
    throw new Error('Invalid signature or message format');
  }
}