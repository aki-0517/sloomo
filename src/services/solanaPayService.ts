import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  createTransferInstruction, 
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { CURRENT_NETWORK, TOKEN_ADDRESSES } from '../constants/solana';
import { PaymentRequest, QRCodeData, TransferRequest } from '../types/payment';

class SolanaPayService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK, 'confirmed');
  }

  createPaymentQR(
    recipient: string,
    amount?: number,
    currency: 'USDC' | 'SOL' | 'BONK' = 'USDC',
    memo?: string
  ): QRCodeData {
    const reference = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      type: 'payment',
      recipient,
      amount,
      currency,
      memo,
      reference,
    };
  }

  parsePaymentQR(qrString: string): QRCodeData {
    try {
      return JSON.parse(qrString) as QRCodeData;
    } catch (error) {
      throw new Error('Invalid QR code format');
    }
  }

  async createPaymentTransaction(
    request: PaymentRequest,
    senderPublicKey: string
  ): Promise<Transaction> {
    const sender = new PublicKey(senderPublicKey);
    const recipient = new PublicKey(request.recipient);

    if (request.currency === 'SOL') {
      return this.createSOLTransaction(sender, recipient, request.amount);
    } else if (request.currency === 'USDC') {
      return this.createUSDCTransaction(sender, recipient, request.amount);
    } else if (request.currency === 'BONK') {
      return this.createBONKTransaction(sender, recipient, request.amount);
    }

    throw new Error(`Unsupported currency: ${request.currency}`);
  }

  private async createSOLTransaction(
    sender: PublicKey,
    recipient: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const transaction = new Transaction();
    
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    transaction.add(transferInstruction);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    return transaction;
  }

  private async createUSDCTransaction(
    sender: PublicKey,
    recipient: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const transaction = new Transaction();

    const senderTokenAccount = await getAssociatedTokenAddress(
      TOKEN_ADDRESSES.USDC,
      sender
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      TOKEN_ADDRESSES.USDC,
      recipient
    );

    const transferInstruction = createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      sender,
      amount * Math.pow(10, 6), // USDC has 6 decimals
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    return transaction;
  }

  private async createBONKTransaction(
    sender: PublicKey,
    recipient: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const transaction = new Transaction();

    const senderTokenAccount = await getAssociatedTokenAddress(
      TOKEN_ADDRESSES.BONK,
      sender
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      TOKEN_ADDRESSES.BONK,
      recipient
    );

    const transferInstruction = createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      sender,
      amount * Math.pow(10, 5), // BONK has 5 decimals
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    return transaction;
  }

  async createP2PTransfer(
    request: TransferRequest,
    senderPublicKey: string
  ): Promise<Transaction> {
    if (request.useCredit) {
      return this.createCreditAssistedTransfer(request, senderPublicKey);
    }

    return this.createPaymentTransaction(
      {
        recipient: request.recipient,
        amount: request.amount,
        currency: request.currency,
        memo: request.memo,
      },
      senderPublicKey
    );
  }

  private async createCreditAssistedTransfer(
    request: TransferRequest,
    senderPublicKey: string
  ): Promise<Transaction> {
    const transaction = new Transaction();

    const paymentTx = await this.createPaymentTransaction(
      {
        recipient: request.recipient,
        amount: request.amount,
        currency: request.currency,
        memo: request.memo,
      },
      senderPublicKey
    );

    transaction.add(...paymentTx.instructions);

    return transaction;
  }

  validatePaymentRequest(request: PaymentRequest): boolean {
    try {
      new PublicKey(request.recipient);
      
      if (request.amount !== undefined && (request.amount <= 0 || !Number.isFinite(request.amount))) {
        return false;
      }

      if (!['USDC', 'SOL', 'BONK'].includes(request.currency)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async estimateTransactionFee(transaction: Transaction): Promise<number> {
    try {
      const feeCalculator = await this.connection.getFeeForMessage(
        transaction.compileMessage()
      );
      
      return feeCalculator.value ? feeCalculator.value / LAMPORTS_PER_SOL : 0.000005;
    } catch (error) {
      console.error('Error estimating transaction fee:', error);
      return 0.000005; // Default fee estimate
    }
  }

  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      );
      
      return !confirmation.value.err;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      return false;
    }
  }
}

export const solanaPayService = new SolanaPayService();