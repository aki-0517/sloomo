# Sloomo Comprehensive Implementation Guide

A consolidated technical reference for implementing Solana smart contracts and React Native client integration using Anchor framework and Mobile Wallet Adapter.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Smart Contract Implementation](#smart-contract-implementation)
3. [Client-Side Integration](#client-side-integration)
4. [Mobile Wallet Adapter Integration](#mobile-wallet-adapter-integration)
5. [Data Management & State](#data-management--state)
6. [Security Implementation](#security-implementation)
7. [Testing Strategies](#testing-strategies)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  React Native   │    │ Mobile Wallet    │    │ Solana Network  │
│  + Expo SDK     │◄──►│    Adapter       │◄──►│  + Anchor       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   UI Components            Authentication           Smart Contracts
   - React Native           - MWA Protocol           - Rust Programs
   - Paper Design           - Secure Signing         - IDL Generation
   - TanStack Query         - Session Management     - PDA Management
```

### Technology Stack

**Smart Contract Layer**
- Anchor Framework 0.31.1
- Rust 1.75+
- SPL Token 2022 for yield-bearing tokens
- Solana CLI 1.18+

**Client Layer**
- React Native 0.76 + Expo SDK 52
- TypeScript for type safety
- TanStack React Query for state management
- React Native Paper for UI components

**Integration Layer**
- Mobile Wallet Adapter (MWA) for secure transactions
- Anchor TypeScript client for program interaction
- Solana Web3.js for RPC communication

---

## Smart Contract Implementation

### Core Program Structure

```rust
use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},
    associated_token::AssociatedToken,
};

declare_id!("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

#[program]
pub mod sloomo_portfolio {
    use super::*;
    
    pub fn initialize_portfolio(
        ctx: Context<InitializePortfolio>, 
        params: InitPortfolioParams
    ) -> Result<()> {
        let portfolio = &mut ctx.accounts.portfolio;
        let owner = &ctx.accounts.owner;
        
        // Validation
        require!(
            params.initial_allocations.len() <= MAX_ALLOCATIONS,
            SloomoError::AllocationOverflow
        );
        
        let total_percentage: u16 = params.initial_allocations
            .iter()
            .map(|a| a.target_percentage)
            .sum();
        
        require!(
            total_percentage <= 10000,
            SloomoError::AllocationOverflow
        );
        
        // Initialize portfolio
        portfolio.owner = owner.key();
        portfolio.bump = ctx.bumps.portfolio;
        portfolio.total_value = 0;
        portfolio.last_rebalance = Clock::get()?.unix_timestamp;
        portfolio.created_at = Clock::get()?.unix_timestamp;
        portfolio.updated_at = Clock::get()?.unix_timestamp;
        
        portfolio.allocations = params.initial_allocations
            .into_iter()
            .map(|params| AllocationData {
                mint: params.mint,
                symbol: params.symbol,
                current_amount: 0,
                target_percentage: params.target_percentage,
                apy: 0,
                last_yield_update: Clock::get().unwrap().unix_timestamp,
            })
            .collect();
        
        emit!(PortfolioInitialized {
            owner: owner.key(),
            portfolio: portfolio.key(),
            allocations_count: portfolio.allocations.len() as u8,
        });
        
        Ok(())
    }
    
    pub fn rebalance_portfolio(
        ctx: Context<RebalancePortfolio>,
        target_allocations: Vec<AllocationTarget>,
    ) -> Result<()> {
        let portfolio = &mut ctx.accounts.portfolio;
        let current_time = Clock::get()?.unix_timestamp;
        
        // Rate limiting (once per day)
        require!(
            current_time - portfolio.last_rebalance >= 86400,
            SloomoError::RebalanceTooFrequent
        );
        
        // Validate target allocations
        let total_target: u16 = target_allocations.iter()
            .map(|t| t.target_percentage)
            .sum();
        require!(total_target <= 10000, SloomoError::AllocationOverflow);
        
        // Calculate current total portfolio value
        let total_portfolio_value = calculate_total_portfolio_value(&portfolio)?;
        
        // Execute rebalancing for each asset
        for target in target_allocations.iter() {
            let current_allocation = portfolio.allocations
                .iter_mut()
                .find(|a| a.mint == target.mint)
                .ok_or(SloomoError::InvalidTokenMint)?;
            
            let target_value = total_portfolio_value
                .checked_mul(target.target_percentage as u64)
                .ok_or(SloomoError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SloomoError::MathOverflow)?;
            
            let current_value = current_allocation.current_amount;
            
            if target_value > current_value {
                // Buy more
                let buy_amount = target_value - current_value;
                execute_buy_transaction(&ctx, &target.mint, buy_amount)?;
            } else if target_value < current_value {
                // Sell
                let sell_amount = current_value - target_value;
                execute_sell_transaction(&ctx, &target.mint, sell_amount)?;
            }
            
            current_allocation.current_amount = target_value;
            current_allocation.target_percentage = target.target_percentage;
        }
        
        portfolio.last_rebalance = current_time;
        portfolio.updated_at = current_time;
        
        emit!(PortfolioRebalanced {
            owner: portfolio.owner,
            total_value: total_portfolio_value,
            timestamp: current_time,
        });
        
        Ok(())
    }
}
```

### Account Structures

```rust
#[account]
pub struct Portfolio {
    pub owner: Pubkey,
    pub bump: u8,
    pub total_value: u64,
    pub last_rebalance: i64,
    pub allocations: Vec<AllocationData>,
    pub performance_history: Vec<PerformanceSnapshot>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_rebalancing: bool, // Reentrancy protection
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AllocationData {
    pub mint: Pubkey,
    pub symbol: String,
    pub current_amount: u64,
    pub target_percentage: u16, // basis points (10000 = 100%)
    pub apy: u16, // basis points
    pub last_yield_update: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PerformanceSnapshot {
    pub timestamp: i64,
    pub total_value: u64,
    pub growth_rate: i16, // basis points
}

#[account]
pub struct YieldBearingToken {
    pub mint: Pubkey,
    pub symbol: String,
    pub name: String,
    pub current_apy: u16, // basis points
    pub tvl: u64,
    pub logo_uri: String,
    pub last_updated: i64,
    pub is_active: bool,
}
```

### Account Validation Patterns

```rust
#[derive(Accounts)]
#[instruction(params: InitPortfolioParams)]
pub struct InitializePortfolio<'info> {
    #[account(
        init,
        payer = owner,
        space = Portfolio::SIZE,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RebalancePortfolio<'info> {
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner,
        constraint = !portfolio.is_rebalancing @ SloomoError::RebalanceInProgress
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub token_program: Interface<'info, TokenInterface>,
}
```

---

## Client-Side Integration

### Anchor Program Hook

```typescript
// app/src/hooks/useAnchorProgram.tsx
import { useConnection } from "../utils/ConnectionProvider";
import { useMobileWallet } from "../utils/useMobileWallet";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../anchor/sloomo_portfolio";
import IDL from "../anchor/sloomo_portfolio.json";

export function useAnchorProgram(): Program<SloomoPortfolio> | null {
  const { connection } = useConnection();
  const { selectedAccount } = useMobileWallet();

  return useMemo(() => {
    if (!selectedAccount) return null;

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: selectedAccount.publicKey,
        signTransaction: async (tx) => {
          throw new Error("Use useMobileWallet for signing");
        },
        signAllTransactions: async (txs) => {
          throw new Error("Use useMobileWallet for signing");
        },
      },
      { commitment: "confirmed" }
    );

    return new Program(IDL as SloomoPortfolio, provider);
  }, [connection, selectedAccount]);
}
```

### PDA Utilities

```typescript
// app/src/utils/pdaUtils.ts
import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

export function getPortfolioPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("portfolio"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function getYieldTokenAccountPda(
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("yield_token"), mint.toBuffer()],
    PROGRAM_ID
  );
}
```

### Portfolio Management Hooks

```typescript
// app/src/hooks/usePortfolio.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnchorProgram } from "./useAnchorProgram";
import { getPortfolioPda } from "../utils/pdaUtils";

export function usePortfolio(owner: PublicKey) {
  const program = useAnchorProgram();
  const queryClient = useQueryClient();
  
  const portfolioPda = useMemo(() => {
    if (!program || !owner) return null;
    return getPortfolioPda(owner)[0];
  }, [program, owner]);
  
  const portfolioQuery = useQuery({
    queryKey: ["portfolio", portfolioPda?.toString()],
    queryFn: async () => {
      if (!program || !portfolioPda) return null;
      try {
        return await program.account.portfolio.fetch(portfolioPda);
      } catch (error) {
        if (error.message.includes("Account does not exist")) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!program && !!portfolioPda,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const initializePortfolio = useMutation({
    mutationFn: async (params: InitPortfolioParams) => {
      if (!program || !portfolioPda) throw new Error("Program not ready");
      
      return await program.methods
        .initializePortfolio(params)
        .accounts({
          portfolio: portfolioPda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio"],
      });
    },
  });
  
  return {
    portfolio: portfolioQuery.data,
    isLoading: portfolioQuery.isLoading,
    error: portfolioQuery.error,
    initializePortfolio,
    refetch: portfolioQuery.refetch,
  };
}
```

---

## Mobile Wallet Adapter Integration

### Transaction Execution Hook

```typescript
// app/src/hooks/usePortfolioActions.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobileWallet } from "../utils/useMobileWallet";
import { useAnchorProgram } from "./useAnchorProgram";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";

export function usePortfolioActions() {
  const program = useAnchorProgram();
  const { signAndSendTransaction, selectedAccount } = useMobileWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  const executeRebalance = useMutation({
    mutationFn: async (targetAllocations: AllocationTarget[]) => {
      if (!program || !selectedAccount) {
        throw new Error("Program or wallet not available");
      }

      const [portfolioPda] = getPortfolioPda(selectedAccount.publicKey);
      
      // Create Anchor instruction
      const instruction = await program.methods
        .rebalancePortfolio(targetAllocations)
        .accounts({
          portfolio: portfolioPda,
          owner: selectedAccount.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();

      // Build transaction
      const { blockhash, lastValidBlockHeight } = 
        await connection.getLatestBlockhash();
      
      const message = new TransactionMessage({
        payerKey: selectedAccount.publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(message);

      // Execute via MWA
      return await signAndSendTransaction(transaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  return {
    executeRebalance,
    isExecuting: executeRebalance.isPending,
  };
}
```

### MWA Session Management

```typescript
// app/src/utils/useMobileWallet.tsx
import { useState, useCallback, useRef } from 'react';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Account } from '@solana-mobile/mobile-wallet-adapter-protocol';

export const APP_IDENTITY = {
  name: 'Sloomo Portfolio Manager',
  uri: 'https://sloomo.com',
  icon: 'favicon.ico',
};

export function useMobileWallet() {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const authorizationInProgress = useRef(false);

  const authorize = useCallback(async () => {
    if (authorizationInProgress.current) return;
    
    try {
      authorizationInProgress.current = true;
      
      const authResult = await transact(async (wallet: Web3MobileWallet) => {
        return await wallet.authorize({
          cluster: 'solana:devnet',
          identity: APP_IDENTITY,
        });
      });

      setSelectedAccount(authResult.accounts[0]);
      return authResult;
    } finally {
      authorizationInProgress.current = false;
    }
  }, []);

  const signAndSendTransaction = useCallback(
    async (transaction: VersionedTransaction) => {
      return await transact(async (wallet: Web3MobileWallet) => {
        // Reauthorize if needed
        await wallet.authorize({
          cluster: 'solana:devnet',
          identity: APP_IDENTITY,
        });

        const [signature] = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return signature;
      });
    },
    []
  );

  const disconnect = useCallback(async () => {
    await transact(async (wallet: Web3MobileWallet) => {
      await wallet.deauthorize({});
    });
    setSelectedAccount(null);
  }, []);

  return {
    selectedAccount,
    authorize,
    disconnect,
    signAndSendTransaction,
    isConnected: !!selectedAccount,
  };
}
```

---

## Data Management & State

### React Query Configuration

```typescript
// app/src/providers/QueryClientProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry account not found errors
        if (error.message.includes("Account does not exist")) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

### Portfolio Context Provider

```typescript
// app/src/providers/PortfolioProvider.tsx
import { createContext, useContext, ReactNode } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import { useMobileWallet } from "../utils/useMobileWallet";

interface PortfolioContextType {
  portfolio: PortfolioAccount | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  initializePortfolio: (params: InitPortfolioParams) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { selectedAccount } = useMobileWallet();
  const portfolioHook = usePortfolio(selectedAccount?.publicKey);

  const value: PortfolioContextType = {
    portfolio: portfolioHook.portfolio,
    isLoading: portfolioHook.isLoading,
    error: portfolioHook.error,
    refresh: portfolioHook.refetch,
    initializePortfolio: portfolioHook.initializePortfolio.mutateAsync,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioContext() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolioContext must be used within PortfolioProvider");
  }
  return context;
}
```

---

## Security Implementation

### Input Validation

```rust
// Smart Contract Security Patterns
pub fn validate_allocation_params(allocations: &Vec<AllocationParams>) -> Result<()> {
    // Check total allocation doesn't exceed 100%
    let total: u16 = allocations.iter().map(|a| a.target_percentage).sum();
    require!(total <= 10000, SloomoError::AllocationOverflow);
    
    // Check individual allocations are valid
    for allocation in allocations {
        require!(
            allocation.target_percentage <= 10000,
            SloomoError::InvalidAllocationPercentage
        );
        require!(
            allocation.symbol.len() <= 32,
            SloomoError::SymbolTooLong
        );
    }
    
    Ok(())
}

// Math overflow protection
fn safe_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or(SloomoError::MathOverflow.into())
}

fn safe_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b).ok_or(SloomoError::MathOverflow.into())
}
```

### Client-Side Validation

```typescript
// app/src/utils/validation.ts
export function validateAllocationPercentages(allocations: AllocationParams[]): boolean {
  const total = allocations.reduce((sum, allocation) => sum + allocation.target_percentage, 0);
  return total <= 10000; // 100% in basis points
}

export function validateTransactionAmount(amount: number): boolean {
  return amount > 0 && amount < Number.MAX_SAFE_INTEGER;
}

export function sanitizeSymbol(symbol: string): string {
  return symbol.trim().substring(0, 32); // Max 32 characters
}
```

### Reentrancy Protection

```rust
// Smart contract reentrancy protection
pub fn rebalance_portfolio(ctx: Context<RebalancePortfolio>) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    
    // Check if already rebalancing
    require!(!portfolio.is_rebalancing, SloomoError::RebalanceInProgress);
    
    // Set rebalancing flag
    portfolio.is_rebalancing = true;
    
    // Perform rebalancing operations...
    
    // Reset flag before returning
    portfolio.is_rebalancing = false;
    Ok(())
}
```

---

## Testing Strategies

### Smart Contract Testing

```typescript
// tests/portfolio.ts
describe("Portfolio Management", () => {
  let program: Program<SloomoPortfolio>;
  let provider: anchor.AnchorProvider;
  let portfolioPda: PublicKey;

  beforeEach(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.SloomoPortfolio;
    
    [portfolioPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );
  });

  it("initializes portfolio correctly", async () => {
    const params = {
      initialAllocations: [
        {
          mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
          symbol: "USDC",
          targetPercentage: 6000, // 60%
        },
        {
          mint: new PublicKey("So11111111111111111111111111111111111111112"),
          symbol: "SOL",
          targetPercentage: 4000, // 40%
        },
      ],
    };

    const tx = await program.methods
      .initializePortfolio(params)
      .accounts({
        portfolio: portfolioPda,
        owner: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const portfolio = await program.account.portfolio.fetch(portfolioPda);
    expect(portfolio.allocations).to.have.length(2);
    expect(portfolio.allocations[0].targetPercentage).to.equal(6000);
  });

  it("prevents invalid allocations", async () => {
    const invalidParams = {
      initialAllocations: [
        {
          mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
          symbol: "INVALID",
          targetPercentage: 15000, // 150% - invalid
        },
      ],
    };

    try {
      await program.methods
        .initializePortfolio(invalidParams)
        .accounts({
          portfolio: portfolioPda,
          owner: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown error");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("AllocationOverflow");
    }
  });
});
```

### Client-Side Testing

```typescript
// app/src/hooks/__tests__/usePortfolio.test.tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { usePortfolio } from "../usePortfolio";
import { TestProviders } from "../../test-utils/TestProviders";

describe("usePortfolio", () => {
  it("fetches portfolio data correctly", async () => {
    const { result } = renderHook(
      () => usePortfolio(new PublicKey("...")),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.portfolio).toBeDefined();
  });

  it("handles account not found gracefully", async () => {
    const { result } = renderHook(
      () => usePortfolio(new PublicKey("11111111111111111111111111111111")),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.portfolio).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
```

---

## Performance Optimization

### Smart Contract Optimization

```rust
// Efficient account size calculation
impl Portfolio {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner
        1 +  // bump
        8 +  // total_value
        8 +  // last_rebalance
        4 + (MAX_ALLOCATIONS * AllocationData::SIZE) + // allocations
        4 + (MAX_PERFORMANCE_SNAPSHOTS * PerformanceSnapshot::SIZE) + // performance_history
        8 +  // created_at
        8 +  // updated_at
        1;   // is_rebalancing
}

// Batch operations for efficiency
pub fn batch_update_yields(
    ctx: Context<BatchUpdateYields>,
    updates: Vec<YieldUpdate>,
) -> Result<()> {
    for update in updates {
        update_single_yield(&ctx, update)?;
    }
    Ok(())
}
```

### Client-Side Optimization

```typescript
// Memoized PDA calculations
const portfolioPda = useMemo(() => {
  if (!owner) return null;
  return getPortfolioPda(owner)[0];
}, [owner]);

// Optimized query keys
const portfolioQueryKey = useMemo(() => [
  "portfolio",
  connection.rpcEndpoint,
  owner?.toString(),
], [connection.rpcEndpoint, owner]);

// Efficient data fetching
const { data: portfolio } = useQuery({
  queryKey: portfolioQueryKey,
  queryFn: fetchPortfolio,
  enabled: !!owner,
  select: useCallback((data) => ({
    ...data,
    allocations: data.allocations.map(formatAllocation),
  }), []),
});
```

---

## Error Handling

### Comprehensive Error Types

```rust
// Smart contract errors
#[error_code]
pub enum SloomoError {
    #[msg("Invalid allocation percentage")]
    InvalidAllocationPercentage,
    #[msg("Insufficient balance for rebalancing")]
    InsufficientBalance,
    #[msg("Portfolio not found")]
    PortfolioNotFound,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Rebalancing too frequent")]
    RebalanceTooFrequent,
    #[msg("Total allocation exceeds 100%")]
    AllocationOverflow,
    #[msg("Yield update too frequent")]
    YieldUpdateTooFrequent,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid APY value")]
    InvalidApy,
    #[msg("Rebalancing in progress")]
    RebalanceInProgress,
    #[msg("Symbol too long")]
    SymbolTooLong,
}
```

### Client Error Handling

```typescript
// app/src/utils/errorHandler.ts
export function parseAnchorError(error: any): string {
  if (error.error?.errorCode?.code) {
    const errorCode = error.error.errorCode.code;
    
    const errorMessages: Record<string, string> = {
      InvalidAllocationPercentage: "配分比率が無効です",
      InsufficientBalance: "残高が不足しています",
      AllocationOverflow: "配分の合計が100%を超えています",
      RebalanceTooFrequent: "リバランスの実行間隔が短すぎます",
      Unauthorized: "認証されていないアクセスです",
      InvalidTokenMint: "無効なトークンミントです",
      YieldUpdateTooFrequent: "利回り更新が頻繁すぎます",
      MathOverflow: "数値オーバーフローが発生しました",
      InvalidApy: "無効なAPY値です",
      RebalanceInProgress: "リバランス処理中です",
      SymbolTooLong: "シンボルが長すぎます",
    };
    
    return errorMessages[errorCode] || `プログラムエラー: ${errorCode}`;
  }
  
  if (error.message?.includes("Account does not exist")) {
    return "アカウントが見つかりません";
  }
  
  if (error.message?.includes("Insufficient funds")) {
    return "手数料に必要なSOLが不足しています";
  }
  
  return error.message || "不明なエラーが発生しました";
}

// Global error boundary
export function useErrorHandler() {
  return useCallback((error: Error, errorInfo?: any) => {
    const message = parseAnchorError(error);
    
    // Log to analytics
    console.error("Error:", { error, errorInfo, message });
    
    // Show user-friendly error
    Alert.alert("エラー", message);
  }, []);
}
```

---

## Best Practices

### Smart Contract Best Practices

1. **Security First**
   - Always validate inputs
   - Use checked arithmetic operations
   - Implement reentrancy protection
   - Use proper access controls

2. **Efficient Design**
   - Minimize account size
   - Use appropriate data types
   - Batch operations when possible
   - Optimize for common use cases

3. **Error Handling**
   - Define comprehensive error types
   - Use descriptive error messages
   - Fail fast with clear errors
   - Handle edge cases explicitly

### Client Development Best Practices

1. **State Management**
   - Use React Query for server state
   - Implement proper caching strategies
   - Handle loading and error states
   - Optimize re-renders with memoization

2. **Security**
   - Always validate user inputs
   - Use MWA for all wallet operations
   - Never store private keys
   - Implement proper error boundaries

3. **Performance**
   - Minimize unnecessary re-renders
   - Use efficient query patterns
   - Implement proper data normalization
   - Optimize images and assets

4. **User Experience**
   - Provide clear loading indicators
   - Show meaningful error messages
   - Implement offline support
   - Use progressive enhancement

### Integration Best Practices

1. **Transaction Management**
   - Always simulate before sending
   - Handle transaction failures gracefully
   - Provide transaction status updates
   - Implement retry mechanisms

2. **Data Consistency**
   - Invalidate relevant queries after mutations
   - Use optimistic updates sparingly
   - Handle stale data appropriately
   - Implement proper error recovery

3. **Testing**
   - Test all error scenarios
   - Use integration tests for critical paths
   - Mock external dependencies
   - Test on real devices/networks

This comprehensive guide provides the foundation for implementing a robust, secure, and performant Solana dApp using Anchor smart contracts and React Native with Mobile Wallet Adapter integration.