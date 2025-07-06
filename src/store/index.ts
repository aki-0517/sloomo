import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

import walletReducer from './walletSlice';
import creditReducer from './creditSlice';
import paymentReducer from './paymentSlice';
import userReducer from './userSlice';
import { supabaseMiddleware } from './supabaseMiddleware';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user', 'wallet'], // Only persist user and wallet data
};

const rootReducer = combineReducers({
  wallet: walletReducer,
  credit: creditReducer,
  payment: paymentReducer,
  user: userReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(supabaseMiddleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;