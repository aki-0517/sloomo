import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { 
  transact, 
  Web3MobileWallet 
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { CURRENT_NETWORK, TOKEN_ADDRESSES } from '../constants/solana';
import { WalletConnection, TokenAccount } from '../types/wallet';

class WalletService {
  private connection: Connection;
  private wallet: Web3MobileWallet | null = null;

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK, 'confirmed');
  }

  async connectWallet(): Promise<WalletConnection> {
    return await transact(async (wallet: Web3MobileWallet) => {
      const accounts = await wallet.authorize({
        cluster: 'devnet',
        identity: {
          name: 'Solana Mobile CreditPay',
          uri: 'https://creditpay.app',
          icon: 'favicon.ico',
        },
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const publicKey = accounts[0].publicKey;
      this.wallet = wallet;

      return {
        publicKey: publicKey.toString(),
        signTransaction: async (transaction: Transaction) => {
          return await wallet.signTransactions({
            transactions: [transaction],
          });
        },
        signMessage: async (message: string) => {
          const encodedMessage = new TextEncoder().encode(message);
          const signature = await wallet.signMessages({
            addresses: [publicKey],
            payloads: [encodedMessage],
          });
          return signature[0].signature;
        },
        disconnect: async () => {
          await wallet.deauthorize();
          this.wallet = null;
        },
      };
    });
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async getUSDCBalance(publicKey: string): Promise<number> {
    try {
      const pubKey = new PublicKey(publicKey);
      const usdcTokenAccount = await getAssociatedTokenAddress(
        TOKEN_ADDRESSES.USDC,
        pubKey
      );

      const accountInfo = await getAccount(this.connection, usdcTokenAccount);
      return Number(accountInfo.amount) / Math.pow(10, 6); // USDC has 6 decimals
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return 0;
    }
  }

  async getTokenAccounts(publicKey: string): Promise<TokenAccount[]> {
    try {
      const pubKey = new PublicKey(publicKey);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        pubKey,
        {
          programId: TOKEN_ADDRESSES.USDC,
        }
      );

      return tokenAccounts.value.map((account) => ({
        mint: account.account.data.parsed.info.mint,
        owner: account.account.data.parsed.info.owner,
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
      }));
    } catch (error) {
      console.error('Error getting token accounts:', error);
      throw error;
    }
  }

  async createUSDCTokenAccount(publicKey: string): Promise<Transaction> {
    try {
      const pubKey = new PublicKey(publicKey);
      const usdcTokenAccount = await getAssociatedTokenAddress(
        TOKEN_ADDRESSES.USDC,
        pubKey
      );

      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          pubKey,
          usdcTokenAccount,
          pubKey,
          TOKEN_ADDRESSES.USDC
        )
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = pubKey;

      return transaction;
    } catch (error) {
      console.error('Error creating USDC token account:', error);
      throw error;
    }
  }

  async sendTransaction(transaction: Transaction): Promise<string> {
    try {
      if (!this.wallet) {
        throw new Error('Wallet not connected');
      }

      const signedTransactions = await this.wallet.signTransactions({
        transactions: [transaction],
      });

      const signature = await this.connection.sendRawTransaction(
        signedTransactions[0].serialize()
      );

      await this.connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }
}

export const walletService = new WalletService();