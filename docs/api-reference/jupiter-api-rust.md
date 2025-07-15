# Jupiter API Reference (Rust Implementation)

## Overview

Jupiter API is an API for efficiently executing token swaps on the Solana blockchain. This document describes the API specifications including implementation methods in Rust.

> **Note**: User guides have been migrated from Station to a new support system. Please see [Jupiter Helpdesk](https://docs.jup.ag/) for the latest guides.

## Swap API Schema

### 1. Quote (Get Quote)

#### Endpoint
```
GET https://lite-api.jup.ag/swap/v1/quote
```

#### Description
Endpoint to get quotes for use with POST /swap.

> **Reference**: For more details, see [Swap API Documentation](https://docs.jup.ag/apis/swap-api).

#### Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `inputMint` | string | ✓ | Input token mint address |
| `outputMint` | string | ✓ | Output token mint address |
| `amount` | uint64 | ✓ | Raw amount to swap (before decimal places)<br>- For SwapMode=ExactIn: input amount<br>- For SwapMode=ExactOut: output amount |
| `slippageBps` | uint16 |  | Slippage (basis points) |
| `swapMode` | string |  | Possible values: `[ExactIn, ExactOut]`<br>- ExactOut: when exact output amount is needed (e.g., using Swap API as a payment service)<br>- ExactIn: slippage applied to output token<br>- ExactOut: slippage applied to input token<br>- Not all AMMs support ExactOut (currently only Orca Whirlpool, Raydium CLMM, Raydium CPMM)<br>- Default value: `ExactIn` |
| `dexes` | string[] |  | Multiple DEXes can be specified comma-separated<br>Example: `dexes=Raydium,Orca+V2,Meteora+DLMM`<br>If specified, routing will use only those DEXes<br>[Complete list of DEXes](https://docs.jup.ag/docs/apis/swap-api#dexes) |
| `excludeDexes` | string[] |  | Multiple DEXes can be specified comma-separated<br>Example: `excludeDexes=Raydium,Orca+V2,Meteora+DLMM`<br>If specified, routing will exclude those DEXes<br>[Complete list of DEXes](https://docs.jup.ag/docs/apis/swap-api#dexes) |
| `restrictIntermediateTokens` | boolean |  | Restrict intermediate tokens in route to a more stable set of tokens<br>Helps reduce exposure to high slippage routes<br>Default value: `true` |
| `onlyDirectRoutes` | boolean |  | Restrict Jupiter routing to single-hop routes only<br>May result in worse routes<br>Default value: `false` |
| `asLegacyTransaction` | boolean |  | Use legacy transaction instead of versioned transaction<br>Default value: `false` |
| `platformFeeBps` | uint16 |  | Fee collection in basis points<br>Used in conjunction with feeAccount in /swap, see [Fee Addition Guide](https://docs.jup.ag/docs/apis/adding-fees) |
| `maxAccounts` | uint64 |  | Rough estimate of maximum number of accounts used in quote<br>Useful when composing your own transaction or doing more accurate resource calculation for better routes<br>Default value: `64` |
| `dynamicSlippage` | boolean |  | If true, slippageBps will be overridden with Dynamic Slippage estimation<br>Value will be returned in /swap endpoint<br>Default value: `false` |

#### Response (200 Success)

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

#### Rust Implementation Example

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

### 2. Swap (Execute Swap)

#### Endpoint
```
POST https://lite-api.jup.ag/swap/v1/swap
```

#### Description
Request a base64-encoded unsigned swap transaction based on the response from /quote.

> **Reference**: For more details, see [Swap API Documentation](https://docs.jup.ag/apis/swap-api).

#### Request Body (application/json)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `userPublicKey` | string | ✓ | User's public key |
| `payer` | string |  | Custom payer to pay for transaction fees and token account rent<br>Since users can close and reopen ATAs elsewhere, fees should account for this |
| `wrapAndUnwrapSol` | boolean |  | Automatically wrap/unwrap SOL within the transaction<br>- true: Use exact SOL amount for wrapping and unwrap all WSOL back to SOL after swap<br>- false: Use exact WSOL amount for swap and don't unwrap WSOL back to SOL after swap<br>- Setting to false requires WSOL token account to be initialized<br>- Ignored if destinationTokenAccount is set<br>Default value: `true` |
| `useSharedAccounts` | boolean |  | Enable use of shared program accounts<br>Important as complex routing may require multiple intermediate token accounts which users may not have<br>If true, you don't need to handle creation of intermediate token accounts for users<br>Shared account routes may fail for new AMMs (low liquidity tokens) |
| `feeAccount` | string |  | Token account used for fee collection<br>Token account mint must be either input or output mint of the swap<br>Referral program usage is no longer required<br>See [Fee Addition Guide](https://docs.jup.ag/docs/apis/adding-fees) |
| `trackingAccount` | string |  | Optional public key for tracking transactions<br>Useful for integrators to retrieve all swap transactions from a public key<br>Query data in block explorers like Solscan/SolanaFM or Dune/Flipside |
| `prioritizationFeeLamports` | object |  | Priority fee settings |
| `asLegacyTransaction` | boolean |  | Build legacy transaction instead of default versioned transaction<br>Use with asLegacyTransaction in /quote, otherwise transaction may be too large<br>Default value: `false` |
| `destinationTokenAccount` | string |  | Public key of token account to receive output tokens from swap<br>If not provided, signer's token account will be used<br>If provided, token account is assumed to be already initialized |
| `dynamicComputeUnitLimit` | boolean |  | When enabled, performs swap simulation to get compute units used and sets it to ComputeBudget compute unit limit<br>This incurs additional RPC calls for simulation<br>Recommended to enable for accurate compute unit estimation and to reduce required priority fees or increase likelihood of being included in blocks<br>Default value: `false` |
| `skipUserAccountsRpcCalls` | boolean |  | When enabled, doesn't make additional RPC calls to check required accounts<br>Only enable if all accounts required for transaction are already set up, such as SOL wrap/unwrap or destination account creation<br>Default value: `false` |
| `dynamicSlippage` | boolean |  | When enabled, estimates slippage and applies it directly to swap transaction, overriding slippageBps parameter in quote response<br>Use with dynamicSlippage in /quote, otherwise slippageBps from /quote will be used<br>Default value: `false` |
| `computeUnitPriceMicroLamports` | uint64 |  | Use exact compute unit price for priority fee calculation<br>computeUnitLimit (1400000) * computeUnitPriceMicroLamports<br>Recommended to use prioritizationFeeLamports and dynamicComputeUnitLimit instead of passing your own compute unit price |
| `blockhashSlotsToExpiry` | uint8 |  | Number of slots you want the transaction to be valid for<br>Example: passing 10 slots means transaction will be valid for approximately 400ms * 10 = ~4 seconds |
| `quoteResponse` | object | ✓ | Response object from /quote |

#### Response (200 Success)

```json
{
  "swapTransaction": "string",
  "lastValidBlockHeight": "uint64",
  "prioritizationFeeLamports": "uint64"
}
```

#### Rust Implementation Example

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

### 3. Swap Instructions (Swap Instructions)

#### Endpoint
```
POST https://lite-api.jup.ag/swap/v1/swap-instructions
```

#### Description
Request swap instructions that can use quotes obtained from /quote.

> **Reference**: For more details, see [Swap API Documentation](https://docs.jup.ag/apis/swap-api).

#### Request Body
Similar parameter structure as the swap endpoint.

#### Response (200 Success)

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

#### Rust Implementation Example

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

### 4. Program ID to Label (Program ID to Label Conversion)

#### Endpoint
```
GET https://lite-api.jup.ag/swap/v1/program-id-to-label
```

#### Description
Returns a hash with program ID as key and label as value. This is used to map errors from transactions by identifying the problematic program ID. Can be used in conjunction with excludeDexes or dexes parameters.

#### Response (200 Default Response)

```json
{
  "property name*": "string"
}
```

#### Rust Implementation Example

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

## Other API Schemas

- **Ultra API Schema**: Advanced routing capabilities
- **Trigger API Schema**: Conditional swap functionality
- **Recurring API Schema**: Recurring swap functionality
- **Token API Schema**: Token information retrieval
- **Price API Schema**: Price information retrieval

## Related Links

- [Jupiter Developer Documentation](https://docs.jup.ag/)
- [Jupiter Helpdesk](https://docs.jup.ag/)
- [API Status](https://status.jup.ag/)
- [Fee Addition Guide](https://docs.jup.ag/docs/apis/adding-fees)
- [DEX List](https://docs.jup.ag/docs/apis/swap-api#dexes)