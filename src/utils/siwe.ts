import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';

export interface SiweMessageData {
  message: {
    address: string;
    chainId: number;
    domain: string;
    issuedAt: string;
    nonce: string;
    statement: string;
    uri: string;
    version: string;
    expirationTime?: string;
  };
  signature: string;
}

export const verifySIWEMessage = async (
  signedMessage: SiweMessageData
): Promise<{ address: string }> => {
  try {
    const siweMessage = new SiweMessage(signedMessage.message);
    await siweMessage.verify({ signature: signedMessage.signature });
    return { address: signedMessage.message.address };
  } catch (error) {
    throw new Error('Invalid SIWE message');
  }
};

// Helper function for generating test SIWE messages
export const generateSiweMessage = async (): Promise<SiweMessageData> => {
  if (!process.env.ETHEREUM_PRIVATE_KEY) {
    throw new Error('ETHEREUM_PRIVATE_KEY environment variable is required');
  }
  
  // Create a wallet using the provided private key.
  const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY as string);
  
  // Use the wallet’s own address (which is already checksummed)
  const checksumAddress = wallet.address;
  
  // Create the SIWE message data
  const messageData: SiweMessageData['message'] = {
    domain: 'localhost:3000',
    address: checksumAddress,
    statement: 'Sign in with Ethereum to the app.',
    uri: 'http://localhost:3000',
    version: '1',
    chainId: 1,
    // Use a 16-byte nonce for brevity; adjust as needed
    nonce: ethers.utils.hexlify(ethers.utils.randomBytes(16)),
    issuedAt: new Date().toISOString(),
  };

  const message = new SiweMessage(messageData);
  const preparedMessage = message.prepareMessage();
  const signature = await wallet.signMessage(preparedMessage);

  return {
    message: messageData,
    signature,
  };
};
