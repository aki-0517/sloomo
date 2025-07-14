# Jupiter API リファレンス (Rust実装)

## 概要

Jupiter APIは、Solanaブロックチェーン上でのトークンスワップを効率的に実行するためのAPIです。このドキュメントでは、Rustでの実装方法を含むAPI仕様について説明します。

> **注意**: ユーザーガイドはStationから新しいサポートシステムに移行されました。最新のガイドについては[Jupiter Helpdesk](https://docs.jup.ag/)をご覧ください。

## Swap API スキーマ

### 1. Quote（見積もり取得）

#### エンドポイント
```
GET https://lite-api.jup.ag/swap/v1/quote
```

#### 説明
POST /swapで使用する見積もりを取得するためのエンドポイントです。

> **参考**: 詳細については[Swap API ドキュメント](https://docs.jup.ag/apis/swap-api)を参照してください。

#### リクエストパラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `inputMint` | string | ✓ | 入力トークンのミントアドレス |
| `outputMint` | string | ✓ | 出力トークンのミントアドレス |
| `amount` | uint64 | ✓ | スワップする生の金額（小数点前）<br>- SwapMode=ExactInの場合: 入力金額<br>- SwapMode=ExactOutの場合: 出力金額 |
| `slippageBps` | uint16 |  | スリッページ（ベーシスポイント） |
| `swapMode` | string |  | 可能な値: `[ExactIn, ExactOut]`<br>- ExactOut: 正確な出力金額が必要な場合（支払いサービスとしてのSwap API使用など）<br>- ExactInの場合: 出力トークンにスリッページが適用<br>- ExactOutの場合: 入力トークンにスリッページが適用<br>- すべてのAMMがExactOutをサポートしているわけではありません（現在はOrca Whirlpool、Raydium CLMM、Raydium CPMMのみ）<br>- デフォルト値: `ExactIn` |
| `dexes` | string[] |  | 複数のDEXをカンマ区切りで指定可能<br>例: `dexes=Raydium,Orca+V2,Meteora+DLMM`<br>指定された場合、そのDEXのみを使用してルーティング<br>[DEXの完全リスト](https://docs.jup.ag/docs/apis/swap-api#dexes) |
| `excludeDexes` | string[] |  | 複数のDEXをカンマ区切りで指定可能<br>例: `excludeDexes=Raydium,Orca+V2,Meteora+DLMM`<br>指定された場合、そのDEXを除外してルーティング<br>[DEXの完全リスト](https://docs.jup.ag/docs/apis/swap-api#dexes) |
| `restrictIntermediateTokens` | boolean |  | ルート内の中間トークンをより安定したトークンのセットに制限<br>高スリッページルートへの露出を減らすのに役立ちます<br>デフォルト値: `true` |
| `onlyDirectRoutes` | boolean |  | Jupiterのルーティングを単一ホップルートのみに制限<br>結果として悪いルートになる可能性があります<br>デフォルト値: `false` |
| `asLegacyTransaction` | boolean |  | バージョン付きトランザクションの代わりにレガシートランザクションを使用<br>デフォルト値: `false` |
| `platformFeeBps` | uint16 |  | ベーシスポイントでの手数料徴収<br>/swapのfeeAccountと併用、[手数料追加ガイド](https://docs.jup.ag/docs/apis/adding-fees)参照 |
| `maxAccounts` | uint64 |  | 見積もりに使用される最大アカウント数の概算<br>独自のトランザクションを構成する場合や、より良いルートのためのリソース計算をより正確に行う場合に有用<br>デフォルト値: `64` |
| `dynamicSlippage` | boolean |  | trueの場合、slippageBpsはDynamic Slippageの推定値で上書きされます<br>値は/swapエンドポイントで返されます<br>デフォルト値: `false` |

#### レスポンス（200 成功）

```json
{
  "inputMint": "string",
  "inAmount": "uint64",
  "outputMint": "string", 
  "outAmount": "uint64",
  "otherAmountThreshold": "uint64",
  "swapMode": "ExactIn | ExactOut",
  "slippageBps": "uint16",
  "platformFee": "object",
  "priceImpactPct": "number",
  "routePlan": "object[]",
  "contextSlot": "uint64",
  "timeTaken": "number"
}
```

#### Rust実装例

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .build()?;

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Accept", "application/json".parse()?);

    let request = client.request(reqwest::Method::GET, "https://lite-api.jup.ag/swap/v1/quote")
        .headers(headers);

    let response = request.send().await?;
    let body = response.text().await?;

    println!("{}", body);

    Ok(())
}
```

### 2. Swap（スワップ実行）

#### エンドポイント
```
POST https://lite-api.jup.ag/swap/v1/swap
```

#### 説明
/quoteのレスポンスに基づいてbase64エンコードされた未署名スワップトランザクションを要求します。

> **参考**: 詳細については[Swap API ドキュメント](https://docs.jup.ag/apis/swap-api)を参照してください。

#### リクエストボディ（application/json）

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `userPublicKey` | string | ✓ | ユーザーの公開鍵 |
| `payer` | string |  | トランザクション手数料とトークンアカウントのレントを支払うカスタムペイヤー<br>ユーザーは他の場所でATAを閉じて再度開くことができるため、手数料はこれを考慮する必要があります |
| `wrapAndUnwrapSol` | boolean |  | SOLをトランザクション内で自動的にラップ/アンラップ<br>- true: SOL金額を厳密に使用してラップし、スワップ後にすべてのWSOLをSOLに戻します<br>- false: WSOL金額を厳密に使用してスワップし、スワップ後にWSOLをSOLに戻しません<br>- falseに設定するには、WSOLトークンアカウントが初期化されている必要があります<br>- destinationTokenAccountが設定されている場合は無視されます<br>デフォルト値: `true` |
| `useSharedAccounts` | boolean |  | 共有プログラムアカウントの使用を有効化<br>複雑なルーティングでは複数の中間トークンアカウントが必要で、ユーザーが持っていない可能性があるため重要<br>trueの場合、ユーザー用の中間トークンアカウントの作成を処理する必要はありません<br>新しいAMM（低流動性トークン）では共有アカウントルートが失敗する可能性があります |
| `feeAccount` | string |  | 手数料の徴収に使用されるトークンアカウント<br>トークンアカウントのミントはスワップの入力または出力ミントのいずれかである必要があります<br>リファラルプログラムの使用は不要になりました<br>[手数料追加ガイド](https://docs.jup.ag/docs/apis/adding-fees)参照 |
| `trackingAccount` | string |  | トランザクションを追跡するための任意の公開鍵<br>インテグレーターが公開鍵からすべてのスワップトランザクションを取得するのに有用<br>Solscan/SolanaFMなどのブロックエクスプローラーまたはDune/Flipsideなどでデータをクエリ |
| `prioritizationFeeLamports` | object |  | 優先度手数料の設定 |
| `asLegacyTransaction` | boolean |  | デフォルトのバージョン付きトランザクションではなくレガシートランザクションを構築<br>/quoteのasLegacyTransactionと併用、そうでなければトランザクションが大きすぎる可能性があります<br>デフォルト値: `false` |
| `destinationTokenAccount` | string |  | スワップの出力トークンを受け取るトークンアカウントの公開鍵<br>提供されない場合、署名者のトークンアカウントが使用されます<br>提供された場合、トークンアカウントは既に初期化されているものと想定されます |
| `dynamicComputeUnitLimit` | boolean |  | 有効化すると、スワップシミュレーションを実行して使用されるコンピュートユニットを取得し、ComputeBudgetのコンピュートユニット制限に設定<br>これにより、シミュレーションのための追加のRPC呼び出しが発生します<br>コンピュートユニットを正確に推定し、必要な優先度手数料を削減するか、ブロックに含まれる可能性を高めるために有効化することを推奨<br>デフォルト値: `false` |
| `skipUserAccountsRpcCalls` | boolean |  | 有効化すると、必要なアカウントをチェックするための追加のRPC呼び出しを行いません<br>SOLのラップ/アンラップや宛先アカウントの作成など、トランザクションに必要なすべてのアカウントが既に設定されている場合のみ有効化<br>デフォルト値: `false` |
| `dynamicSlippage` | boolean |  | 有効化すると、スリッページを推定し、スワップトランザクションに直接適用し、クォートレスポンスのslippageBpsパラメータを上書きします<br>/quoteのdynamicSlippageと併用、そうでなければ/quoteのslippageBpsが使用されます<br>デフォルト値: `false` |
| `computeUnitPriceMicroLamports` | uint64 |  | 優先度手数料の計算に正確なコンピュートユニット価格を使用<br>computeUnitLimit (1400000) * computeUnitPriceMicroLamports<br>独自のコンピュートユニット価格を渡すのではなく、prioritizationFeeLamportsとdynamicComputeUnitLimitの使用を推奨 |
| `blockhashSlotsToExpiry` | uint8 |  | トランザクションを有効にしたいスロット数<br>例: 10スロットを渡すと、トランザクションは約400ms * 10 = 約4秒間有効 |
| `quoteResponse` | object | ✓ | /quoteからのレスポンスオブジェクト |

#### レスポンス（200 成功）

```json
{
  "swapTransaction": "string",
  "lastValidBlockHeight": "uint64",
  "prioritizationFeeLamports": "uint64"
}
```

#### Rust実装例

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .build()?;

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Content-Type", "application/json".parse()?);
    headers.insert("Accept", "application/json".parse()?);

    let data = r#"{
    "userPublicKey": "jdocuPgEAjMfihABsPgKEvYtsmMzjUHeq9LX4Hvs7f3",
    "quoteResponse": {
        "inputMint": "So11111111111111111111111111111111111111112",
        "inAmount": "1000000",
        "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "outAmount": "125630",
        "otherAmountThreshold": "125002",
        "swapMode": "ExactIn",
        "slippageBps": 50,
        "platformFee": null,
        "priceImpactPct": "0",
        "routePlan": [
            {
                "swapInfo": {
                    "ammKey": "AvBSC1KmFNceHpD6jyyXBV6gMXFxZ8BJJ3HVUN8kCurJ",
                    "label": "Obric V2",
                    "inputMint": "So11111111111111111111111111111111111111112",
                    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "inAmount": "1000000",
                    "outAmount": "125630",
                    "feeAmount": "5",
                    "feeMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                },
                "percent": 100
            }
        ]
    },
    "prioritizationFeeLamports": {
        "priorityLevelWithMaxLamports": {
            "maxLamports": 10000000,
            "priorityLevel": "veryHigh"
        }
    },
    "dynamicComputeUnitLimit": true
}"#;

    let json: serde_json::Value = serde_json::from_str(&data)?;

    let request = client.request(reqwest::Method::POST, "https://lite-api.jup.ag/swap/v1/swap")
        .headers(headers)
        .json(&json);

    let response = request.send().await?;
    let body = response.text().await?;

    println!("{}", body);

    Ok(())
}
```

### 3. Swap Instructions（スワップ命令）

#### エンドポイント
```
POST https://lite-api.jup.ag/swap/v1/swap-instructions
```

#### 説明
/quoteから取得したクォートを使用できるスワップ命令を要求します。

> **参考**: 詳細については[Swap API ドキュメント](https://docs.jup.ag/apis/swap-api)を参照してください。

#### リクエストボディ
swapエンドポイントと同様のパラメータ構造です。

#### レスポンス（200 成功）

```json
{
  "otherInstructions": "object[]",
  "computeBudgetInstructions": "object[]",
  "setupInstructions": "object[]",
  "swapInstruction": "object",
  "cleanupInstruction": "object",
  "addressLookupTableAddresses": "string[]"
}
```

#### Rust実装例

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .build()?;

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Content-Type", "application/json".parse()?);
    headers.insert("Accept", "application/json".parse()?);

    let data = r#"{
    "userPublicKey": "jdocuPgEAjMfihABsPgKEvYtsmMzjUHeq9LX4Hvs7f3",
    "quoteResponse": {
        "inputMint": "So11111111111111111111111111111111111111112",
        "inAmount": "1000000",
        "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "outAmount": "125630",
        "otherAmountThreshold": "125002",
        "swapMode": "ExactIn",
        "slippageBps": 50,
        "platformFee": null,
        "priceImpactPct": "0",
        "routePlan": [
            {
                "swapInfo": {
                    "ammKey": "AvBSC1KmFNceHpD6jyyXBV6gMXFxZ8BJJ3HVUN8kCurJ",
                    "label": "Obric V2",
                    "inputMint": "So11111111111111111111111111111111111111112",
                    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "inAmount": "1000000",
                    "outAmount": "125630",
                    "feeAmount": "5",
                    "feeMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                },
                "percent": 100
            }
        ]
    },
    "prioritizationFeeLamports": {
        "priorityLevelWithMaxLamports": {
            "maxLamports": 10000000,
            "priorityLevel": "veryHigh"
        }
    },
    "dynamicComputeUnitLimit": true
}"#;

    let json: serde_json::Value = serde_json::from_str(&data)?;

    let request = client.request(reqwest::Method::POST, "https://lite-api.jup.ag/swap/v1/swap-instructions")
        .headers(headers)
        .json(&json);

    let response = request.send().await?;
    let body = response.text().await?;

    println!("{}", body);

    Ok(())
}
```

### 4. Program ID to Label（プログラムIDからラベルへの変換）

#### エンドポイント
```
GET https://lite-api.jup.ag/swap/v1/program-id-to-label
```

#### 説明
プログラムIDをキーとし、ラベルを値とするハッシュを返します。これは、障害のあるプログラムIDを特定することでトランザクションからのエラーをマッピングするのに使用されます。excludeDexesまたはdexesパラメータと併用できます。

#### レスポンス（200 デフォルトレスポンス）

```json
{
  "property name*": "string"
}
```

#### Rust実装例

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .build()?;

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Accept", "application/json".parse()?);

    let request = client.request(reqwest::Method::GET, "https://lite-api.jup.ag/swap/v1/program-id-to-label")
        .headers(headers);

    let response = request.send().await?;
    let body = response.text().await?;

    println!("{}", body);

    Ok(())
}
```

## その他のAPI スキーマ

- **Ultra API スキーマ**: 高度なルーティング機能
- **Trigger API スキーマ**: 条件付きスワップ機能
- **Recurring API スキーマ**: 定期的なスワップ機能
- **Token API スキーマ**: トークン情報取得
- **Price API スキーマ**: 価格情報取得

## 関連リンク

- [Jupiter開発者ドキュメント](https://docs.jup.ag/)
- [Jupiter Helpdesk](https://docs.jup.ag/)
- [API ステータス](https://status.jup.ag/)
- [手数料追加ガイド](https://docs.jup.ag/docs/apis/adding-fees)
- [DEXリスト](https://docs.jup.ag/docs/apis/swap-api#dexes)