# Client-Contract Integration

Integration of React Native app and Anchor smart contract using Solana Mobile Stack (MWA)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Environment Setup](#environment-setup)
4. [Mobile Wallet Adapter Setup](#mobile-wallet-adapter-setup)
5. [Data Management & Caching](#data-management--caching)
6. [Development](#development)
7. [Test Strategy](#test-strategy)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

### Overall Flow

```
                                                         
   React Native        Mobile Wallet         Solana Network 
   + Expo SDK             Adapter             + Jupiter API  
                                                         
                                                      
        ↓                      ↓                      ↓    
     UI Layer               Auth Layer              Logic Layer   
     - Paper                - MWA                  - Rust  
     - Query                - Auth                 - IDL   
     - Jupiter              - USDC Rebalance      - Stablecoin   
                                                        
```

### Stablecoin Portfolio Management Flow

```typescript
// Initial rebalance
// 1. Deposit USDC
anchorProgram.methods.depositUsdc()
  ↓
// 2. Select equity tokens and set % to create allocation
anchorProgram.methods.addOrUpdateAllocation()
  ↓
// 3. Execute rebalance
anchorProgram.methods.realJupiterRebalance()
  ↓
// 4. Swap USDC to equity tokens via Jupiter API
jupiterSwapInstructions()
  ↓
// 5. Adjust holdings according to allocation ratio

// Occasional rebalance
// 1. Add equity token or edit allocation in UI
anchorProgram.methods.addOrUpdateAllocation()
  ↓
// 2. Execute rebalance
anchorProgram.methods.realJupiterRebalance()
  ↓
// 3. Execute necessary swaps via Jupiter API
jupiterSwapInstructions()
  ↓
// 4. Update data and reflect in UI 
queryClient.invalidateQueries()
```

---

## Architecture

### 1. Directory Structure

```
sloomo/
   app/                    # React Native client
      src/
         anchor/         # Generated Anchor type definitions
         components/     # UI components
         hooks/          # Custom hooks
         utils/          # Utility functions
   contract/               # Anchor smart contract
      programs/
      tests/
      target/
   docs/                   # Documentation
```

### 2. Dependencies

```json
// app/package.json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.31.1",
    "@solana/web3.js": "^1.95.7",
    "@solana/spl-token": "^0.4.9",
    "@solana-mobile/mobile-wallet-adapter-protocol": "^2.3.0",
    "@tanstack/react-query": "^5.59.20",
    "react-native-paper": "^5.12.5"
  }
}
```

### 3. IDL and Client Integration

```bash
# Generate IDL in contract/
cd contract
anchor build

# Copy IDL to client
cp target/idl/sloomo_portfolio.json ../app/src/anchor/
```

### 4. Jupiter API Integration

```typescript
// app/src/utils/jupiterClient.ts
import { Jupiter, RouteInfo } from '@jup-ag/core';
import { Connection, PublicKey } from '@solana/web3.js';

export class JupiterClient {
  private jupiter: Jupiter;

  constructor(connection: Connection) {
    this.jupiter = new Jupiter({ connection });
  }

  async getSwapQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    slippageBps: number = 50
  ): Promise<RouteInfo | null> {
    const routes = await this.jupiter.computeRoutes({
      inputMint,
      outputMint,
      amount,
      slippageBps,
    });

    return routes.routesInfos[0] || null;
  }

  async executeSwap(route: RouteInfo, userPublicKey: PublicKey) {
    return await this.jupiter.exchange({
      route,
      userPublicKey,
    });
  }
}
```

---

## Environment Setup

### 1. Anchor Program Setup

```typescript
// app/src/anchor/types.ts
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "./sloomo_portfolio";

export type SloomoPortfolioProgram = Program<SloomoPortfolio>;

// Anchor account type definitions
export interface PortfolioAccount {
  owner: PublicKey;
  bump: number;
  totalValue: BN;
  lastRebalance: BN;
  allocations: AllocationData[];
  performanceHistory: PerformanceSnapshot[];
  createdAt: BN;
  updatedAt: BN;
  isRebalancing: boolean;
}

export interface AllocationData {
  mint: PublicKey;
  symbol: string;
  currentAmount: BN;
  targetPercentage: number; // basis points (10000 = 100%)
  apy: number; // basis points (managed client-side)
  lastYieldUpdate: BN;
}

export interface PerformanceSnapshot {
  timestamp: BN;
  totalValue: BN;
  growthRate: number; // basis points
}
```

### 2. Program Hook

```typescript
// app/src/hooks/useAnchorProgram.tsx
import { useConnection } from "../utils/ConnectionProvider";
import { useMobileWallet } from "../utils/useMobileWallet";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../anchor/sloomo_portfolio";
import IDL from "../anchor/sloomo_portfolio.json";

export function useAnchorProgram(): SloomoPortfolioProgram | null {
  const { connection } = useConnection();
  const { selectedAccount } = useMobileWallet();

  if (!selectedAccount) return null;

  // Create provider for MWA integration
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
}
```

### 3. PDA Utility Functions

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

export function getEquityTokenAccountPda(
  portfolio: PublicKey,
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("equity_token"), portfolio.toBuffer(), mint.toBuffer()],
    PROGRAM_ID
  );
}
```

---

## Mobile Wallet Adapter Setup

### 1. Stablecoin Rebalance Execution Hook

```typescript
// app/src/hooks/useStablecoinRebalance.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobileWallet } from "../utils/useMobileWallet";
import { useAnchorProgram } from "./useAnchorProgram";
import { useConnection } from "../utils/ConnectionProvider";
import { TransactionMessage, VersionedTransaction, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { JupiterClient } from "../utils/jupiterClient";

export function useStablecoinRebalance() {
  const program = useAnchorProgram();
  const wallet = useMobileWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const jupiterClient = new JupiterClient(connection);

  return useMutation({
    mutationFn: async (params: {
      targetAllocations: Array<{mint: PublicKey, targetPercentage: number}>;
      slippageBps?: number;
    }) => {
      if (!program || !wallet.selectedAccount) {
        throw new Error("Program or wallet not available");
      }

      const [portfolioPda] = getPortfolioPda(wallet.selectedAccount.publicKey);
      
      // USDC token account
      const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // devnet USDC
      const usdcTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        wallet.selectedAccount.publicKey
      );
      
      // Create Anchor instruction (rebalance directive)
      const rebalanceInstruction = await program.methods
        .realJupiterRebalance(
          params.targetAllocations,
          params.slippageBps || 50
        )
        .accounts({
          portfolio: portfolioPda,
          owner: wallet.selectedAccount.publicKey,
          usdcTokenAccount,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Get Jupiter swap instructions
      const jupiterInstructions = await this.getJupiterSwapInstructions(
        params.targetAllocations,
        usdcMint,
        wallet.selectedAccount.publicKey
      );

      // Create transaction
      const { blockhash, lastValidBlockHeight } = 
        await connection.getLatestBlockhash();
      
      const message = new TransactionMessage({
        payerKey: wallet.selectedAccount.publicKey,
        recentBlockhash: blockhash,
        instructions: [rebalanceInstruction, ...jupiterInstructions],
      }).compileToLegacyMessage();

      const transaction = new VersionedTransaction(message);

      // Execute transaction with MWA
      return await wallet.signAndSendTransaction(transaction);
    },
    onSuccess: () => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["token-balances"] });
    },
  });

  async function getJupiterSwapInstructions(
    targetAllocations: Array<{mint: PublicKey, targetPercentage: number}>,
    usdcMint: PublicKey,
    userPublicKey: PublicKey
  ) {
    const instructions = [];
    
    // Get USDC balance
    const usdcBalance = await connection.getTokenAccountBalance(
      await getAssociatedTokenAddress(usdcMint, userPublicKey)
    );
    const totalUsdc = usdcBalance.value.uiAmount || 0;

    for (const allocation of targetAllocations) {
      const targetAmount = Math.floor(totalUsdc * allocation.targetPercentage / 10000);
      
      if (targetAmount > 0) {
        const route = await jupiterClient.getSwapQuote(
          usdcMint,
          allocation.mint,
          targetAmount * 1e6, // USDC has 6 decimals
          50 // 0.5% slippage
        );

        if (route) {
          const swapResult = await jupiterClient.executeSwap(route, userPublicKey);
          instructions.push(...swapResult.instructions);
        }
      }
    }

    return instructions;
  }
}
```

### 2. Data Fetch Query Hook

```typescript
// app/src/hooks/usePortfolioData.tsx
export function usePortfolioAccount({ owner }: { owner: PublicKey }) {
  const program = useAnchorProgram();
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["portfolio", { endpoint: connection.rpcEndpoint, owner: owner.toString() }],
    queryFn: async (): Promise<PortfolioAccount | null> => {
      if (!program) return null;

      const [portfolioPda] = getPortfolioPda(owner);
      
      try {
        return await program.account.portfolio.fetch(portfolioPda);
      } catch (error) {
        // If account does not exist
        if (error.message.includes("Account does not exist")) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!program && !!owner,
  });
}

export function useStablecoinBalances({ owner }: { owner: PublicKey }) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["stablecoin-balances", { endpoint: connection.rpcEndpoint, owner: owner.toString() }],
    queryFn: async () => {
      if (!owner) return [];

      // List of yield-bearing stablecoin mint addresses
      const stablecoinMints = [
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
        new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"), // USDT
        // Other yield-bearing stablecoins
      ];

      const balances = [];
      for (const mint of stablecoinMints) {
        try {
          const tokenAccount = await getAssociatedTokenAddress(mint, owner);
          const balance = await connection.getTokenAccountBalance(tokenAccount);
          
          balances.push({
            mint,
            balance: balance.value.uiAmount || 0,
            decimals: balance.value.decimals,
          });
        } catch (error) {
          // If account does not exist, set to 0
          balances.push({
            mint,
            balance: 0,
            decimals: 6,
          });
        }
      }

      return balances;
    },
    enabled: !!owner,
  });
}
```

---

## Data Management & Caching

### 1. React Query Setup

```typescript
// app/src/providers/QueryClientProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Do not retry for specific errors
        return failureCount < 3 && !error.message.includes("Account does not exist");
      },
    },
  },
});
```

### 2. Context Management

```typescript
// app/src/providers/PortfolioProvider.tsx
import { createContext, useContext, ReactNode } from "react";
import { usePortfolioAccount } from "../hooks/usePortfolioData";
import { useMobileWallet } from "../utils/useMobileWallet";

interface PortfolioContextType {
  portfolio: PortfolioAccount | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { selectedAccount } = useMobileWallet();
  const portfolioQuery = usePortfolioAccount({ 
    owner: selectedAccount?.publicKey 
  });

  const value: PortfolioContextType = {
    portfolio: portfolioQuery.data || null,
    isLoading: portfolioQuery.isLoading,
    error: portfolioQuery.error,
    refresh: portfolioQuery.refetch,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return context;
}
```

---

## Development

### Step 1: Prepare Anchor Program

```bash
# 1. Build program in contract/
cd contract
anchor build
anchor test

# 2. Copy IDL to client
cp target/idl/sloomo_portfolio.json ../app/src/anchor/
```

### Step 2: Create Type Definitions & Utilities

```typescript
// Generate Anchor account type definitions in app/src/anchor/generated.ts
anchor generate --program-id F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS
```

### Step 3: Implement Hooks

```typescript
// 1. Implement useAnchorProgram
// 2. Implement PDA utilities  
// 3. Implement usePortfolioActions
// 4. Implement usePortfolioData
```

### Step 4: Connect UI Components

```typescript
// app/src/components/portfolio/PortfolioScreen.tsx
export function PortfolioScreen() {
  const { portfolio, isLoading } = usePortfolio();
  const initializePortfolio = useInitializePortfolio();
  const rebalancePortfolio = useRebalancePortfolio();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (!portfolio) {
    return (
      <InitializePortfolioForm
        onSubmit={(data) => initializePortfolio.mutate(data)}
        isLoading={initializePortfolio.isPending}
      />
    );
  }

  return (
    <PortfolioDetails
      portfolio={portfolio}
      onRebalance={() => rebalancePortfolio.mutate()}
    />
  );
}
```

### Step 5: Error Handling

```typescript
// app/src/utils/errorHandler.ts
export function handleAnchorError(error: any) {
  if (error?.code) {
    // Anchor error code
    switch (error.code) {
      case 6000:
        return "Portfolio does not exist";
      case 6001:
        return "No permission";
      default:
        return `Error code: ${error.code}`;
    }
  }
  
  if (error?.message?.includes("Account does not exist")) {
    return "Account not found";
  }
  
  return error?.message || "Unknown error occurred";
}
```

---

## Test Strategy

### 1. Unit Tests

```typescript
// app/src/hooks/__tests__/usePortfolioActions.test.tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { useInitializePortfolio } from "../usePortfolioActions";

describe("useInitializePortfolio", () => {
  it("should initialize portfolio correctly", async () => {
    const { result } = renderHook(() => useInitializePortfolio(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        equityTokenMints: [new PublicKey("...")],
        targetAllocations: [10000],
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

### 2. Integration Test Environment

```bash
# 1. Test with local validator
solana-test-validator --reset

# 2. Deploy contract locally
cd contract
anchor deploy --provider.cluster localnet

# 3. Connect app to localhost
# Set to localhost:8899 in app/src/utils/ConnectionProvider.tsx

# 4. Run tests on emulator/device
cd app
yarn android
```

### 3. Functional Test Items

- [ ] Wallet connection & authentication
- [ ] Portfolio initialization
- [ ] Create/update equity token account
- [ ] Execute rebalance & authentication
- [ ] Transaction signing and MWA integration
- [ ] Error handling
- [ ] Behavior when offline

### 4. Performance Test

```typescript
// app/src/__tests__/performance.test.tsx
import { measureUserInteraction } from "@testing-library/react-native";

it("portfolio loading should be under 2 seconds", async () => {
  const { duration } = await measureUserInteraction(() => {
    // Execute portfolio loading
  });
  
  expect(duration).toBeLessThan(2000);
});
```

---

## Troubleshooting

### Common Issues & Architecture

#### 1. "Program account not found"

```typescript
// Solution: Check if program IDL is properly deployed
const PROGRAM_ID = new PublicKey("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

// Check deployed program ID
anchor show --program-id
```

#### 2. "Transaction simulation failed"

```typescript
// Solution: Check for insufficient SOL balance
const balance = await connection.getBalance(wallet.publicKey);
if (balance < LAMPORTS_PER_SOL * 0.01) {
  throw new Error("Insufficient SOL balance");
}
```

#### 3. "Account does not exist"

```typescript
// Solution: Check if PDA is derived correctly
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("portfolio"), owner.toBuffer()],
  PROGRAM_ID
);
console.log(`PDA: ${pda.toString()}, Bump: ${bump}`);
```

#### 4. Mobile Wallet Adapter Error

```typescript
// Solution: Check wallet app
try {
  await wallet.connect();
} catch (error) {
  if (error.message.includes("no installed wallet")) {
    // Guide to install compatible wallet app:
    showWalletInstallationGuide();
  }
}
```

### Debug Utility Functions

```typescript
// app/src/utils/debug.ts
export function logTransaction(signature: string) {
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

export function logAccount(address: PublicKey) {
  console.log(`Account: https://explorer.solana.com/address/${address}?cluster=devnet`);
}
```

---

## Summary

### Notes for Development

- **Security**: Always use MWA for wallet operations
- **UX Consideration**: Pay attention to signature confirmation screens, etc.
- **Transactions**: Proper creation and handling of status
- **Error Handling**: Proper handling of RPC/network errors

### Performance Optimization

- **Use cache**: Proper cache and invalidation with React Query
- **Memoization**: Use useMemo, useCallback
- **Lazy loading**: Fetch/display data only when needed
- **Batching**: Reduce number of requests by batching multiple processes

This integration enables safe and efficient communication between the React Native client and the Anchor smart contract.