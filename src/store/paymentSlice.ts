import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, PaymentRequest, QRCodeData } from '../types/payment';
import { solanaPayService } from '../services/solanaPayService';
import { walletService } from '../services/walletService';

interface PaymentState {
  transactions: Transaction[];
  currentPayment: PaymentRequest | null;
  scannedQR: QRCodeData | null;
  isProcessing: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  transactions: [],
  currentPayment: null,
  scannedQR: null,
  isProcessing: false,
  error: null,
};

export const processPayment = createAsyncThunk(
  'payment/process',
  async (
    { 
      request, 
      senderPublicKey 
    }: { 
      request: PaymentRequest; 
      senderPublicKey: string;
    },
    { rejectWithValue }
  ) => {
    try {
      if (!solanaPayService.validatePaymentRequest(request)) {
        throw new Error('Invalid payment request');
      }

      const transaction = await solanaPayService.createPaymentTransaction(request, senderPublicKey);
      const signature = await walletService.sendTransaction(transaction);
      
      const confirmed = await solanaPayService.confirmTransaction(signature);
      
      if (!confirmed) {
        throw new Error('Transaction failed to confirm');
      }

      const newTransaction: Transaction = {
        id: signature,
        type: 'payment',
        amount: request.amount,
        currency: request.currency,
        sender: senderPublicKey,
        recipient: request.recipient,
        status: 'confirmed',
        signature,
        timestamp: new Date(),
        memo: request.memo,
        reference: request.reference,
      };

      return newTransaction;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Payment processing failed');
    }
  }
);

export const processP2PTransfer = createAsyncThunk(
  'payment/p2pTransfer',
  async (
    { 
      recipient, 
      amount, 
      currency, 
      memo, 
      senderPublicKey,
      useCredit = false
    }: { 
      recipient: string;
      amount: number;
      currency: 'USDC' | 'SOL' | 'BONK';
      memo?: string;
      senderPublicKey: string;
      useCredit?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const transferRequest = {
        recipient,
        amount,
        currency,
        memo,
        useCredit,
      };

      const transaction = await solanaPayService.createP2PTransfer(transferRequest, senderPublicKey);
      const signature = await walletService.sendTransaction(transaction);
      
      const confirmed = await solanaPayService.confirmTransaction(signature);
      
      if (!confirmed) {
        throw new Error('Transfer failed to confirm');
      }

      const newTransaction: Transaction = {
        id: signature,
        type: 'transfer',
        amount,
        currency,
        sender: senderPublicKey,
        recipient,
        status: 'confirmed',
        signature,
        timestamp: new Date(),
        memo,
      };

      return newTransaction;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'P2P transfer failed');
    }
  }
);

export const scanQRCode = createAsyncThunk(
  'payment/scanQR',
  async (qrString: string, { rejectWithValue }) => {
    try {
      const qrData = solanaPayService.parsePaymentQR(qrString);
      return qrData;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Invalid QR code');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPayment: (state, action: PayloadAction<PaymentRequest | null>) => {
      state.currentPayment = action.payload;
    },
    clearScannedQR: (state) => {
      state.scannedQR = null;
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
    },
    updateTransactionStatus: (state, action: PayloadAction<{ id: string; status: Transaction['status'] }>) => {
      const transaction = state.transactions.find(tx => tx.id === action.payload.id);
      if (transaction) {
        transaction.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Process payment
      .addCase(processPayment.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.transactions.unshift(action.payload);
        state.currentPayment = null;
        state.error = null;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      
      // Process P2P transfer
      .addCase(processP2PTransfer.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(processP2PTransfer.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.transactions.unshift(action.payload);
        state.error = null;
      })
      .addCase(processP2PTransfer.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      
      // Scan QR code
      .addCase(scanQRCode.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(scanQRCode.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.scannedQR = action.payload;
        state.error = null;
      })
      .addCase(scanQRCode.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setCurrentPayment, 
  clearScannedQR, 
  addTransaction, 
  updateTransactionStatus 
} = paymentSlice.actions;

export default paymentSlice.reducer;