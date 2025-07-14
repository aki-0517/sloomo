import { useMemo } from 'react';
import { Connection } from '@solana/web3.js';

export function useConnection() {
  const connection = useMemo(() => {
    // Use devnet by default as configured in the contract scripts
    return new Connection('https://api.devnet.solana.com', 'confirmed');
  }, []);

  return { connection };
}