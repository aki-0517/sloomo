import { useMemo } from 'react';
import { useConnection } from './useConnection';
import { useAuthorization } from '../utils/useAuthorization';
import { useMobileWallet } from '../utils/useMobileWallet';
import { ContractInteractions } from '../utils/contractInteractions';

export function useContract() {
  const { connection } = useConnection();
  const { selectedAccount } = useAuthorization();
  const { signAndSendTransaction } = useMobileWallet();

  const contractInteractions = useMemo(() => {
    if (!selectedAccount || !connection) {
      return null;
    }

    return new ContractInteractions({
      connection,
      userWallet: {
        publicKey: selectedAccount.publicKey,
        signTransaction: async () => {
          // For Mobile Wallet Adapter, we use signAndSendTransaction directly
          throw new Error("Use signAndSendTransaction instead");
        },
        signAndSendTransaction: async (transaction, minContextSlot) => {
          return await signAndSendTransaction(transaction, minContextSlot);
        }
      }
    });
  }, [connection, selectedAccount, signAndSendTransaction]);

  return contractInteractions;
}