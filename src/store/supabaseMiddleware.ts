import { Middleware } from '@reduxjs/toolkit';
import { supabaseUserService } from '../services/supabaseUserService';
import { supabaseCreditService } from '../services/supabaseCreditService';
import { supabaseTransactionService } from '../services/supabaseTransactionService';
import { 
  setUser, 
  updatePreferences, 
  updateKycStatus, 
  setPlaidLinked 
} from './userSlice';
import { 
  updateBalance 
} from './walletSlice';
import { 
  updateCreditLine,
  addLoan,
  updateLoan 
} from './creditSlice';
import { 
  addTransaction,
  updateTransactionStatus 
} from './paymentSlice';

// Supabase middleware for real-time data sync
export const supabaseMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();

  // Handle user-related actions
  if (action.type === 'wallet/connectWallet/fulfilled') {
    const walletAddress = action.payload.publicKey;
    
    // Check if user exists in Supabase, create if not
    supabaseUserService.getUserByWalletAddress(walletAddress)
      .then(user => {
        if (!user) {
          // Create new user
          return supabaseUserService.createUser({
            wallet_address: walletAddress,
            is_onboarded: false
          });
        }
        return user;
      })
      .then(user => {
        if (user) {
          store.dispatch(setUser({ id: user.id }));
          
          // Set up real-time subscriptions
          setupUserSubscriptions(user.id, store);
        }
      })
      .catch(error => {
        console.error('Error handling wallet connection in Supabase:', error);
      });
  }

  // Handle transaction creation
  if (action.type === 'payment/processPayment/fulfilled' || 
      action.type === 'payment/processP2PTransfer/fulfilled') {
    const transaction = action.payload;
    const userId = state.user.id;
    
    if (userId) {
      supabaseTransactionService.createTransaction(userId, transaction)
        .catch(error => {
          console.error('Error saving transaction to Supabase:', error);
        });
    }
  }

  // Handle credit score updates
  if (action.type === 'credit/calculateScore/fulfilled') {
    const { creditScore } = action.payload;
    const userId = state.user.id;
    
    if (userId) {
      supabaseCreditService.saveCreditScore(userId, creditScore)
        .catch(error => {
          console.error('Error saving credit score to Supabase:', error);
        });
    }
  }

  // Handle credit line creation
  if (action.type === 'credit/requestCreditLine/fulfilled') {
    const creditLine = action.payload;
    const userId = state.user.id;
    
    if (userId) {
      supabaseCreditService.createCreditLine(
        userId, 
        creditLine.amount, 
        creditLine.apr
      ).catch(error => {
        console.error('Error creating credit line in Supabase:', error);
      });
    }
  }

  return result;
};

// Set up real-time subscriptions for a user
function setupUserSubscriptions(userId: string, store: any) {
  // Subscribe to user updates
  supabaseUserService.subscribeToUserUpdates(userId, (payload) => {
    if (payload.eventType === 'UPDATE') {
      const user = payload.new;
      
      store.dispatch(updatePreferences(user.preferences));
      store.dispatch(updateKycStatus(user.kyc_status));
      store.dispatch(setPlaidLinked(user.plaid_linked));
    }
  });

  // Subscribe to credit updates
  supabaseCreditService.subscribeToUserCreditUpdates(userId, (payload) => {
    if (payload.table === 'credit_lines') {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const creditLine = payload.new;
        store.dispatch(updateCreditLine({
          id: creditLine.id,
          totalAmount: creditLine.amount,
          availableAmount: creditLine.available_amount,
          usedAmount: creditLine.amount - creditLine.available_amount
        }));
      }
    }
  });

  // Subscribe to transaction updates
  supabaseTransactionService.subscribeToUserTransactions(userId, (payload) => {
    if (payload.eventType === 'INSERT') {
      const transaction = payload.new;
      store.dispatch(addTransaction({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        sender: transaction.sender,
        recipient: transaction.recipient,
        status: transaction.status,
        signature: transaction.signature,
        timestamp: new Date(transaction.created_at),
        memo: transaction.memo,
        reference: transaction.reference
      }));
    } else if (payload.eventType === 'UPDATE') {
      const transaction = payload.new;
      store.dispatch(updateTransactionStatus({
        id: transaction.id,
        status: transaction.status
      }));
    }
  });
}