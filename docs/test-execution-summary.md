# Test Execution Summary

## Test Command List

### Basic Test Commands

| Command                | Target         | Typical Duration | Description                       |
|------------------------|---------------|------------------|-----------------------------------|
| `yarn test:unit`       | Unit tests     | 30-60 sec        | Individual core function tests    |
| `yarn test:integration`| Integration    | 2-5 min          | Full flow integration tests       |
| `yarn test:jupiter`    | Jupiter tests  | 2-3 min          | Jupiter integration-specific tests|
| `yarn test:all`        | All tests      | 3-8 min          | Run all tests                     |

### Additional Test Commands

| Command                | Feature        | Use Case                       |
|------------------------|---------------|--------------------------------|
| `yarn test:watch`      | Watch mode    | Continuous testing during dev  |
| `yarn test:coverage`   | Coverage      | Check code coverage            |
| `yarn test`            | Anchor tests  | Legacy test execution          |

## Test Type Specific Commands

### 1. Run Unit Tests

```bash
# Run all unit tests
yarn test:unit

# Run a specific test file
yarn run ts-mocha -p ./tsconfig.json tests/unit/portfolio_core.test.ts
yarn run ts-mocha -p ./tsconfig.json tests/unit/jupiter_utils.test.ts

# Dry run (check test structure without execution)
yarn test:unit --dry-run
```

**Contents:**
- Portfolio Core Tests: 29 test cases
- Jupiter Utils Tests: 12 test cases
- **Total**: 41 test cases

### 2. Run Integration Tests

```bash
# Run all integration tests
yarn test:integration

# Run a specific test file
yarn run ts-mocha -p ./tsconfig.json tests/integration/real_jupiter_integration.test.ts
```

**Contents:**
- Complete portfolio management flow
- Error case integration tests
- Actual token balance checks
- **Total**: 10 test cases

### 3. Run Jupiter Rebalance Tests

```bash
# Run Jupiter rebalance tests
yarn test:jupiter

# Run with detailed output
yarn test:jupiter --reporter spec
```

**Contents:**
- Jupiter rebalance with real asset movement
- Jupiter quote recording feature
- Multi-token rebalance scenarios
- **Total**: 4 test cases

## Preparation Before Execution

### 1. Set Environment Variables

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

### 2. Prepare Solana Wallet

```bash
# Create wallet (if not created)
solana-keygen new --outfile ~/.config/solana/id.json

# Switch to devnet
solana config set --url devnet

# Get test SOL
solana airdrop 5
```

### 3. Build & Deploy Contract

```bash
# Build contract
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Test Execution Examples

### Success Example

```bash
$ yarn test:unit

Jupiter Utils Unit Tests
  Swap operation calculation
    ✔ Returns empty operation if rebalance not needed
    ✔ Generates buy operation if allocation needs increase
    ...
  
Portfolio Core Unit Tests
  Portfolio initialization
    ✔ Can initialize portfolio with valid parameters
    ✔ Error if allocation sum exceeds 100%
    ...

  29 passing (45s)
```

### Error Examples & Solutions

#### 1. SOL Insufficient Error
```bash
Error: insufficient funds for spend
```
**Solution:**
```bash
solana airdrop 2
```

#### 2. Program Not Deployed Error
```bash
Error: Account does not exist
```
**Solution:**
```bash
anchor build
anchor deploy --provider.cluster devnet
```

#### 3. Airdrop Rate Limit Error
```bash
Error: 429 Too Many Requests
```
**Solution:**
- Retry after some time
- Use https://faucet.solana.com

## Recommended Test Execution Flow

### During Development

```bash
# 1. Check core functions with unit tests
yarn test:unit

# 2. If no issues, run integration tests
yarn test:integration

# 3. Check Jupiter features
yarn test:jupiter
```

### Before Deployment

```bash
# 1. Run all tests
yarn test:all

# 2. Check coverage
yarn test:coverage

# 3. Build check
anchor build
```

### CI/CD

```bash
# 1. Unit tests only (to save SOL)
yarn test:unit

# 2. Static analysis
yarn lint

# 3. Build check
anchor build
```

## Performance Metrics

### Execution Time

| Test Type      | Min Time | Avg Time | Max Time |
|----------------|----------|----------|----------|
| Unit Test      | 30 sec   | 45 sec   | 60 sec   |
| Integration    | 2 min    | 3 min    | 5 min    |
| Jupiter Test   | 2 min    | 2.5 min  | 3 min    |
| All Tests      | 3 min    | 5 min    | 8 min    |

### Resource Usage

- **SOL Consumption**: 0.01-0.05 SOL per test
- **RPC Calls**: 50-200 per test
- **Memory Usage**: 100-500MB

## Troubleshooting

### Common Issues

1. **Network Connection Error**
   - Check devnet RPC response
   - Check internet connection

2. **Timeout Error**
   - Adjust test timeout
   - Check network conditions

3. **Account State Error**
   - Check wallet balance
   - Check program deployment status

### How to Read Logs

```bash
# Detailed log output
yarn test:all --reporter spec

# Debug info on failure
yarn test:all --bail --reporter tap
```

## Notes

1. **devnet limitations**: Beware of airdrop rate limits when running repeatedly
2. **Execution order**: Integration tests change state, so consider order
3. **Cleanup**: Reset account state between tests
4. **Mock vs Real**: Currently runs on devnet, mock support planned for future

---

**Last updated**: December 2024  
**Version**: v0.1.0