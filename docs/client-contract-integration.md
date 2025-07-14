# クライアント・コントラクト連携

Solana Mobile Stack (MWA) を使ったReact Native アプリとAnchor スマートコントラクトの連携

---

## 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [環境設定](#環境設定)
4. [Mobile Wallet Adapter の設定](#mobile-wallet-adapter-の設定)
5. [データ管理・キャッシュ](#データ管理・キャッシュ)
6. [開発](#開発)
7. [テスト戦略](#テスト戦略)
8. [トラブルシューティング](#トラブルシューティング)

---

## システム概要

### 全体の流れ

```
                                                            
   React Native        Mobile Wallet         Solana Network 
   + Expo SDK             Adapter             + Jupiter API  
                                                            
                                                         
        ↓                      ↓                      ↓    
     UI層                   認証層                  ロジック層   
     - Paper                - MWA                  - Rust  
     - Query                - Auth                 - IDL   
     - Jupiter              - USDC Rebalance      - Stablecoin   
                                                           
```

### Stablecoinポートフォリオ管理フロー

```typescript
// 初期リバランス
// 1. USDCをdeposit
anchorProgram.methods.depositUsdc()
  ↓
// 2. 株式トークン選択・%設定してアロケーション作成
anchorProgram.methods.addOrUpdateAllocation()
  ↓
// 3. リバランス実行
anchorProgram.methods.realJupiterRebalance()
  ↓
// 4. Jupiter API経由でUSDC→株式トークンをswap
jupiterSwapInstructions()
  ↓
// 5. 設定アロケーション比率で保有割合を調整

// 適宜リバランス
// 1. UIで株式トークン追加またはアロケーション編集
anchorProgram.methods.addOrUpdateAllocation()
  ↓
// 2. リバランス実行
anchorProgram.methods.realJupiterRebalance()
  ↓
// 3. Jupiter API経由で必要なswapを実行
jupiterSwapInstructions()
  ↓
// 4. データ更新とUI反映 
queryClient.invalidateQueries()
```

---

## アーキテクチャ

### 1. ディレクトリ構造 

```
sloomo/
   app/                    # React Native クライアント
      src/
         anchor/         # 生成されたAnchor型定義
         components/     # UIコンポーネント
         hooks/          # カスタムフック
         utils/          # ユーティリティ関数
   contract/               # Anchor スマートコントラクト
      programs/
      tests/
      target/
   docs/                   # ドキュメント
```

### 2. 依存関係

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

### 3. IDL とクライアント連携

```bash
# contract/ でIDLを生成
cd contract
anchor build

# IDLをクライアントにコピー
cp target/idl/sloomo_portfolio.json ../app/src/anchor/
```

### 4. Jupiter API統合

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

## 環境設定

### 1. Anchor プログラム設定

```typescript
// app/src/anchor/types.ts
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "./sloomo_portfolio";

export type SloomoPortfolioProgram = Program<SloomoPortfolio>;

// Anchor アカウント型定義
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
  apy: number; // basis points (クライアントサイドで管理)
  lastYieldUpdate: BN;
}

export interface PerformanceSnapshot {
  timestamp: BN;
  totalValue: BN;
  growthRate: number; // basis points
}
```

### 2. プログラムフック

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

  // MWAとの統合のためプロバイダーを作成
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

### 3. PDA ユーティリティ関数

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

## Mobile Wallet Adapter の設定

### 1. Stablecoinリバランス実行フック

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
      
      // USDCトークンアカウント
      const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // devnet USDC
      const usdcTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        wallet.selectedAccount.publicKey
      );
      
      // Anchorインストラクション作成 (リバランス指示)
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

      // Jupiter スワップ命令を取得
      const jupiterInstructions = await this.getJupiterSwapInstructions(
        params.targetAllocations,
        usdcMint,
        wallet.selectedAccount.publicKey
      );

      // トランザクション作成
      const { blockhash, lastValidBlockHeight } = 
        await connection.getLatestBlockhash();
      
      const message = new TransactionMessage({
        payerKey: wallet.selectedAccount.publicKey,
        recentBlockhash: blockhash,
        instructions: [rebalanceInstruction, ...jupiterInstructions],
      }).compileToLegacyMessage();

      const transaction = new VersionedTransaction(message);

      // MWA でトランザクション実行
      return await wallet.signAndSendTransaction(transaction);
    },
    onSuccess: () => {
      // キャッシュ更新
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
    
    // USDC残高を取得
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

### 2. データ取得クエリフック

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
        // アカウントが存在しない場合
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

      // yield-bearing stablecoin ミントアドレス一覧
      const stablecoinMints = [
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
        new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"), // USDT
        // 他のyield-bearing stablecoin
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
          // アカウントが存在しない場合は0とする
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

## データ管理・キャッシュ

### 1. React Query 設定

```typescript
// app/src/providers/QueryClientProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30秒
      cacheTime: 5 * 60 * 1000, // 5分
      retry: (failureCount, error) => {
        // 特定のエラーはリトライしない
        return failureCount < 3 && !error.message.includes("Account does not exist");
      },
    },
  },
});
```

### 2. コンテキスト管理

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

## 開発

### ステップ 1: Anchor プログラム準備

```bash
# 1. contract/ でプログラムをビルド
cd contract
anchor build
anchor test

# 2. IDL をクライアントにコピー
cp target/idl/sloomo_portfolio.json ../app/src/anchor/
```

### ステップ 2: 型定義・ユーティリティ作成

```typescript
// app/src/anchor/generated.ts にAnchor アカウント型定義を生成
anchor generate --program-id F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS
```

### ステップ 3: フック実装

```typescript
// 1. useAnchorProgram 実装
// 2. PDA ユーティリティ実装  
// 3. usePortfolioActions 実装
// 4. usePortfolioData 実装
```

### ステップ 4: UI コンポーネント連携

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

### ステップ 5: エラーハンドリング

```typescript
// app/src/utils/errorHandler.ts
export function handleAnchorError(error: any) {
  if (error?.code) {
    // Anchor エラーコード
    switch (error.code) {
      case 6000:
        return "ポートフォリオが存在しません";
      case 6001:
        return "権限がありません";
      default:
        return `エラーコード: ${error.code}`;
    }
  }
  
  if (error?.message?.includes("Account does not exist")) {
    return "アカウントが見つかりません";
  }
  
  return error?.message || "不明なエラーが発生しました";
}
```

---

## テスト戦略

### 1. 単体テスト

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

### 2. 結合テスト環境

```bash
# 1. ローカルValidator でテスト
solana-test-validator --reset

# 2. コントラクトをローカルにデプロイ
cd contract
anchor deploy --provider.cluster localnet

# 3. アプリを localhost に接続
# app/src/utils/ConnectionProvider.tsx で localhost:8899 に設定

# 4. エミュレーター・デバイスでテスト実行
cd app
yarn android
```

### 3. 機能テスト項目

- [ ] ウォレット接続・認証の動作確認
- [ ] ポートフォリオ初期化
- [ ] equity token アカウント作成・更新
- [ ] リバランス実行・認証の動作確認
- [ ] トランザクション署名とMWA連携の確認
- [ ] エラーハンドリングの動作確認
- [ ] オフライン時の挙動確認

### 4. パフォーマンステスト

```typescript
// app/src/__tests__/performance.test.tsx
import { measureUserInteraction } from "@testing-library/react-native";

it("portfolio loading should be under 2 seconds", async () => {
  const { duration } = await measureUserInteraction(() => {
    // ポートフォリオ読み込み実行
  });
  
  expect(duration).toBeLessThan(2000);
});
```

---

## トラブルシューティング

### よくある問題とアーキテクチャ

#### 1. "Program account not found"

```typescript
// 解決: プログラムIDLが正しくデプロイされているか確認
const PROGRAM_ID = new PublicKey("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

// デプロイ済みプログラムID確認
anchor show --program-id
```

#### 2. "Transaction simulation failed"

```typescript
// 解決: SOL残高不足の確認
const balance = await connection.getBalance(wallet.publicKey);
if (balance < LAMPORTS_PER_SOL * 0.01) {
  throw new Error("Insufficient SOL balance");
}
```

#### 3. "Account does not exist"

```typescript
// 解決: PDAが正しくデリベートされているか確認
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("portfolio"), owner.toBuffer()],
  PROGRAM_ID
);
console.log(`PDA: ${pda.toString()}, Bump: ${bump}`);
```

#### 4. Mobile Wallet Adapter エラー

```typescript
// 解決: ウォレットアプリの確認
try {
  await wallet.connect();
} catch (error) {
  if (error.message.includes("no installed wallet")) {
    // 互換性のあるウォレットアプリインストール案内:
    showWalletInstallationGuide();
  }
}
```

### デバッグユーティリティ関数

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

## まとめ

### 開発時の注意点

- **セキュリティ**: ウォレット操作は必ずMWAを通す
- **UX配慮**: 署名確認画面など配慮
- **トランザクション**: 適切な作成と状況の処理
- **エラーハンドリング**: 適切なRPCエラー・ネットワーク対応

### パフォーマンス最適化

- **キャッシュ活用**: React Query で適切なキャッシュ・無効化処理
- **メモ化最適化**: useMemo, useCallback の活用
- **遅延読み込み**: 必要な時だけデータ取得・表示
- **バッチング**: 複数処理のバッチ化でリクエスト数減

この統合により、React Native クライアントとAnchor スマートコントラクトの間で安全で効率的な連携を実現します。