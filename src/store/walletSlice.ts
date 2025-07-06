import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WalletState, WalletConnection } from '../types/wallet';
import { walletService } from '../services/walletService';

interface WalletSliceState extends WalletState {
  connection: WalletConnection | null;
}

const initialState: WalletSliceState = {
  isConnected: false,
  publicKey: null,
  balance: 0,
  usdcBalance: 0,
  isLoading: false,
  error: null,
  connection: null,
};

export const connectWallet = createAsyncThunk(
  'wallet/connect',
  async (_, { rejectWithValue }) => {
    try {
      const connection = await walletService.connectWallet();
      const balance = await walletService.getBalance(connection.publicKey);
      const usdcBalance = await walletService.getUSDCBalance(connection.publicKey);

      return {
        connection,
        publicKey: connection.publicKey,
        balance,
        usdcBalance,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  }
);

export const disconnectWallet = createAsyncThunk(
  'wallet/disconnect',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { wallet: WalletSliceState };
      if (state.wallet.connection) {
        await state.wallet.connection.disconnect();
      }
      return null;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disconnect wallet');
    }
  }
);

export const refreshBalance = createAsyncThunk(
  'wallet/refreshBalance',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { wallet: WalletSliceState };
      const { publicKey } = state.wallet;
      
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      const balance = await walletService.getBalance(publicKey);
      const usdcBalance = await walletService.getUSDCBalance(publicKey);

      return { balance, usdcBalance };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh balance');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateBalance: (state, action: PayloadAction<{ balance?: number; usdcBalance?: number }>) => {
      if (action.payload.balance !== undefined) {
        state.balance = action.payload.balance;
      }
      if (action.payload.usdcBalance !== undefined) {
        state.usdcBalance = action.payload.usdcBalance;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect wallet
      .addCase(connectWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isConnected = true;
        state.publicKey = action.payload.publicKey;
        state.balance = action.payload.balance;
        state.usdcBalance = action.payload.usdcBalance;
        state.connection = action.payload.connection;
        state.error = null;
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Disconnect wallet
      .addCase(disconnectWallet.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(disconnectWallet.fulfilled, (state) => {
        state.isLoading = false;
        state.isConnected = false;
        state.publicKey = null;
        state.balance = 0;
        state.usdcBalance = 0;
        state.connection = null;
        state.error = null;
      })
      .addCase(disconnectWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Refresh balance
      .addCase(refreshBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.balance = action.payload.balance;
        state.usdcBalance = action.payload.usdcBalance;
        state.error = null;
      })
      .addCase(refreshBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateBalance } = walletSlice.actions;
export default walletSlice.reducer;