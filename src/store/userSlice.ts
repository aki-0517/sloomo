import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  id: string | null;
  isOnboarded: boolean;
  preferences: {
    currency: 'USD' | 'SOL';
    notifications: boolean;
    biometric: boolean;
  };
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  plaidLinked: boolean;
}

const initialState: UserState = {
  id: null,
  isOnboarded: false,
  preferences: {
    currency: 'USD',
    notifications: true,
    biometric: false,
  },
  kycStatus: 'not_started',
  plaidLinked: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ id: string }>) => {
      state.id = action.payload.id;
    },
    completeOnboarding: (state) => {
      state.isOnboarded = true;
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    updateKycStatus: (state, action: PayloadAction<UserState['kycStatus']>) => {
      state.kycStatus = action.payload;
    },
    setPlaidLinked: (state, action: PayloadAction<boolean>) => {
      state.plaidLinked = action.payload;
    },
    resetUser: (state) => {
      return initialState;
    },
  },
});

export const { 
  setUser, 
  completeOnboarding, 
  updatePreferences, 
  updateKycStatus, 
  setPlaidLinked, 
  resetUser 
} = userSlice.actions;

export default userSlice.reducer;