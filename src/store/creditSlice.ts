import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CreditScore, CreditLine, Loan } from '../types/credit';
import { creditScoringService } from '../services/creditScoringService';
import { scoreApi } from '../api/scoreApi';

interface CreditState {
  creditScore: CreditScore | null;
  creditLine: CreditLine | null;
  activeLoans: Loan[];
  isLoading: boolean;
  error: string | null;
  lastScoreUpdate: Date | null;
}

const initialState: CreditState = {
  creditScore: null,
  creditLine: null,
  activeLoans: [],
  isLoading: false,
  error: null,
  lastScoreUpdate: null,
};

export const calculateCreditScore = createAsyncThunk(
  'credit/calculateScore',
  async (
    { walletAddress, userId }: { walletAddress: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      const localScore = await creditScoringService.calculateCreditScore(walletAddress);
      
      const apiResponse = await scoreApi.calculateScore({
        userId,
        walletAddress,
      });

      if (apiResponse.success && apiResponse.data) {
        return {
          creditScore: {
            score: apiResponse.data.score,
            onChainScore: apiResponse.data.breakdown.onChain,
            offChainScore: apiResponse.data.breakdown.offChain,
            zkProofScore: apiResponse.data.breakdown.zkProof,
            lastUpdated: new Date(),
          },
          creditLineEligible: apiResponse.data.creditLineEligible,
          maxCreditAmount: apiResponse.data.maxCreditAmount,
          recommendedApr: apiResponse.data.recommendedApr,
        };
      }

      return {
        creditScore: localScore,
        creditLineEligible: localScore.score >= 600,
        maxCreditAmount: Math.max(0, (localScore.score - 600) * 50),
        recommendedApr: Math.max(8, 35 - (localScore.score - 300) / 20),
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to calculate credit score');
    }
  }
);

export const refreshCreditScore = createAsyncThunk(
  'credit/refreshScore',
  async (
    { walletAddress, userId }: { walletAddress: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await scoreApi.refreshScore(userId, walletAddress, true);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to refresh credit score');
      }

      return {
        score: response.data.score,
        onChainScore: response.data.breakdown.onChain,
        offChainScore: response.data.breakdown.offChain,
        zkProofScore: response.data.breakdown.zkProof,
        lastUpdated: new Date(),
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh credit score');
    }
  }
);

export const requestCreditLine = createAsyncThunk(
  'credit/requestCreditLine',
  async (
    { 
      userId, 
      creditScore, 
      requestedAmount 
    }: { 
      userId: string; 
      creditScore: number; 
      requestedAmount: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await scoreApi.estimateCreditLine(creditScore, userId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to request credit line');
      }

      const creditLine: CreditLine = {
        id: `cl-${Date.now()}`,
        userId,
        amount: Math.min(requestedAmount, response.data.estimatedAmount),
        availableAmount: Math.min(requestedAmount, response.data.estimatedAmount),
        apr: response.data.estimatedApr,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'active',
      };

      return creditLine;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to request credit line');
    }
  }
);

const creditSlice = createSlice({
  name: 'credit',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateCreditLine: (state, action: PayloadAction<Partial<CreditLine>>) => {
      if (state.creditLine) {
        state.creditLine = { ...state.creditLine, ...action.payload };
      }
    },
    addLoan: (state, action: PayloadAction<Loan>) => {
      state.activeLoans.push(action.payload);
      if (state.creditLine) {
        state.creditLine.availableAmount -= action.payload.amount;
      }
    },
    updateLoan: (state, action: PayloadAction<{ loanId: string; updates: Partial<Loan> }>) => {
      const loanIndex = state.activeLoans.findIndex(loan => loan.id === action.payload.loanId);
      if (loanIndex !== -1) {
        state.activeLoans[loanIndex] = { ...state.activeLoans[loanIndex], ...action.payload.updates };
      }
    },
    removeLoan: (state, action: PayloadAction<string>) => {
      const loanIndex = state.activeLoans.findIndex(loan => loan.id === action.payload);
      if (loanIndex !== -1) {
        const loan = state.activeLoans[loanIndex];
        state.activeLoans.splice(loanIndex, 1);
        if (state.creditLine) {
          state.creditLine.availableAmount += loan.outstandingAmount;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Calculate credit score
      .addCase(calculateCreditScore.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(calculateCreditScore.fulfilled, (state, action) => {
        state.isLoading = false;
        state.creditScore = action.payload.creditScore;
        state.lastScoreUpdate = new Date();
        state.error = null;
      })
      .addCase(calculateCreditScore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Refresh credit score
      .addCase(refreshCreditScore.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshCreditScore.fulfilled, (state, action) => {
        state.isLoading = false;
        state.creditScore = action.payload;
        state.lastScoreUpdate = new Date();
        state.error = null;
      })
      .addCase(refreshCreditScore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Request credit line
      .addCase(requestCreditLine.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(requestCreditLine.fulfilled, (state, action) => {
        state.isLoading = false;
        state.creditLine = action.payload;
        state.error = null;
      })
      .addCase(requestCreditLine.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  updateCreditLine, 
  addLoan, 
  updateLoan, 
  removeLoan 
} = creditSlice.actions;

export default creditSlice.reducer;