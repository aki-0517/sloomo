# Complete Testing Guide

Comprehensive testing documentation for Sloomo Portfolio smart contracts, including execution commands, test descriptions, and troubleshooting.

## 🧪 Test Overview

This document covers the complete testing suite for Sloomo Portfolio smart contracts, featuring **unit tests** and **integration tests** with real Jupiter API integration for comprehensive test coverage.

### Test Structure

```
tests/
├── unit/                               # Unit Tests
│   ├── portfolio_core.test.ts         # Portfolio core functionality
│   └── jupiter_utils.test.ts          # Jupiter utility functions
└── integration/                       # Integration Tests
    └── real_jupiter_integration.test.ts  # Real Jupiter integration
```

## ⚡ Quick Test Execution

### Basic Test Commands

| Command | Target | Duration | Description |
|---------|--------|----------|-------------|
| `yarn test:unit` | Unit tests | 30-60s | Individual component testing |
| `yarn test:integration` | Integration tests | 2-5min | Complete flow integration testing |
| `yarn test:jupiter` | Jupiter tests | 2-3min | Jupiter integration specialized testing |
| `yarn test:all` | All tests | 3-8min | Complete test suite execution |

### Additional Test Commands

| Command | Function | Use Case |
|---------|----------|----------|
| `yarn test:watch` | Watch mode | Continuous development testing |
| `yarn test:coverage` | Coverage analysis | Code coverage verification |
| `yarn test` | Anchor test | Traditional test execution |

## 🔧 Environment Setup

### Required Environment Variables

Before running tests, ensure these environment variables are set:

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

### Prerequisites

- **Solana CLI** configured for devnet
- **Anchor CLI** installed and configured
- **Node.js** and **yarn** package manager
- **Active internet connection** for devnet operations
- **SOL balance** in test wallet for transaction fees

### Setup Commands

```bash
# 1. Configure Solana for devnet
solana config set --url devnet

# 2. Verify wallet configuration
solana config get

# 3. Check SOL balance (airdrop if needed)
solana balance
solana airdrop 5  # if balance is low

# 4. Install dependencies
yarn install

# 5. Build contracts
anchor build
```

## 📋 Test Categories

### 1. Unit Tests (`yarn test:unit`)

#### Portfolio Core Tests (`portfolio_core.test.ts`)

**Test Count**: 29 test cases

**Coverage Areas**:

##### Portfolio Initialization (8 tests)
- ✅ Normal parameter portfolio initialization
- ✅ Error when allocation total exceeds 100%
- ✅ Handling empty allocation arrays
- ✅ Maximum allocation stress testing
- ✅ Duplicate initialization prevention
- ✅ Owner verification
- ✅ Allocation count validation
- ✅ Initial state verification

##### Investment Operations (6 tests)
- ✅ Normal investment execution
- ✅ Investment amount validation
- ✅ Token symbol validation
- ✅ Zero amount investment errors
- ✅ Portfolio state updates
- ✅ Balance calculations

##### Withdrawal Operations (5 tests)
- ✅ Normal withdrawal execution
- ✅ Insufficient balance handling
- ✅ Invalid token symbol errors
- ✅ Amount validation
- ✅ Portfolio state consistency

##### Yield Management (4 tests)
- ✅ Yield rate updates
- ✅ Invalid yield data handling
- ✅ Empty update arrays
- ✅ APY calculations

##### Jupiter Integration (6 tests)
- ✅ Quote recording functionality
- ✅ Invalid mint validation
- ✅ Amount parameter validation
- ✅ Slippage parameter handling
- ✅ Event emission verification
- ✅ Data persistence

#### Jupiter Utils Tests (`jupiter_utils.test.ts`)

**Test Count**: 12 test cases

**Coverage Areas**:

##### Swap Operation Calculations (7 tests)
- ✅ No rebalancing needed scenarios
- ✅ Allocation increase purchase operations
- ✅ New token investment operations
- ✅ Complex multi-token rebalancing
- ✅ Zero amount operation filtering
- ✅ Edge case handling
- ✅ Calculation accuracy

##### Common Mint Constants (5 tests)
- ✅ Devnet USDC address verification
- ✅ WSOL address validation
- ✅ Mint constant consistency
- ✅ Pubkey conversion validation
- ✅ Address format verification

### 2. Integration Tests (`yarn test:integration`)

#### Real Jupiter Integration (`real_jupiter_integration.test.ts`)

**Test Count**: 10 test cases covering complete portfolio management flow

**Test Scenarios**:

##### Complete Portfolio Management Flow (1 comprehensive test)
- ✅ Portfolio initialization with custom allocations
- ✅ Multi-step investment execution
- ✅ Portfolio state verification
- ✅ Yield rate updates
- ✅ Jupiter rebalancing execution
- ✅ Target allocation updates
- ✅ End-to-end flow validation

##### Jupiter Quote Recording (1 test)
- ✅ Quote data logging
- ✅ Parameter validation
- ✅ Event emission
- ✅ Blockchain state updates

##### Multiple Rebalancing Operations (1 test)
- ✅ Sequential rebalancing execution
- ✅ State transition validation
- ✅ Allocation history tracking
- ✅ Performance impact analysis

##### Error Case Testing (3 tests)
- ✅ Invalid allocation percentage handling
- ✅ Unnecessary rebalancing detection
- ✅ Unauthorized user access prevention
- ✅ Error message validation

##### Token Balance Verification (2 tests)
- ✅ Real token account balance updates
- ✅ Portfolio value consistency
- ✅ Cross-validation with blockchain state
- ✅ Integration accuracy verification

##### Performance and State Testing (2 tests)
- ✅ Portfolio performance tracking
- ✅ State consistency across operations
- ✅ Historical data preservation
- ✅ Calculation accuracy validation

## 🎯 Test Execution Examples

### 1. Unit Test Execution

```bash
# Run all unit tests
yarn test:unit

# Expected output example:
# Portfolio Core Unit Tests
#   ✓ Normal parameter portfolio initialization (234ms)
#   ✓ Investment amount validation (189ms)
#   ✓ Yield rate updates (156ms)
# Jupiter Utils Unit Tests
#   ✓ Devnet USDC address verification (45ms)
#   ✓ Complex multi-token rebalancing (78ms)
# 
# ✅ 29 tests passed (5.2s)
```

### 2. Integration Test Execution

```bash
# Run integration tests
yarn test:integration

# Expected output example:
# Real Jupiter Integration Tests
#   ✓ Complete portfolio management flow (4.8s)
#   ✓ Jupiter quote recording functionality (2.1s)
#   ✓ Multiple rebalancing operations (3.2s)
#   ✓ Error case validation (1.9s)
# 
# ✅ 10 tests passed (12.0s)
```

### 3. Jupiter-Specific Tests

```bash
# Run Jupiter integration tests
yarn test:jupiter

# Expected output example:
# Jupiter API Integration
#   ✓ Real-time quote retrieval (1.8s)
#   ✓ Swap operation validation (2.3s)
#   ✓ Slippage parameter handling (1.1s)
# 
# ✅ 8 tests passed (5.2s)
```

### 4. Complete Test Suite

```bash
# Run all tests
yarn test:all

# Expected comprehensive output:
# Unit Tests: ✅ 29 passed
# Integration Tests: ✅ 10 passed
# Jupiter Tests: ✅ 8 passed
# 
# Total: ✅ 47 tests passed (18.4s)
```

## 🔍 Test Coverage Analysis

### Coverage Command

```bash
# Generate test coverage report
yarn test:coverage

# Coverage output example:
# File                  | % Stmts | % Branch | % Funcs | % Lines
# ----------------------|---------|----------|---------|--------
# All files             |   94.2  |   89.1   |   96.7  |   93.8
# instructions/         |   96.1  |   92.3   |   98.2  |   95.9
# utils/                |   91.5  |   84.7   |   94.1  |   90.8
# state/                |   95.8  |   90.2   |   97.3  |   94.6
```

### Coverage Targets

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 95%
- **Lines**: > 90%

## 🚨 Troubleshooting

### Common Test Errors

#### 1. Environment Issues

**Error**: `Provider not found`
```bash
❌ Error: Provider not found
💡 Solution: Check ANCHOR_PROVIDER_URL and ANCHOR_WALLET environment variables
```

**Error**: `Insufficient SOL balance`
```bash
❌ Error: insufficient funds
💡 Solution: solana airdrop 5
```

#### 2. Network Issues

**Error**: `Connection timeout`
```bash
❌ Error: Failed to connect to devnet
💡 Solution: Check internet connection and devnet status
```

**Error**: `Rate limiting`
```bash
❌ Error: 429 Too Many Requests
💡 Solution: Wait 30 seconds and retry, or use different RPC endpoint
```

#### 3. Program Issues

**Error**: `Program not found`
```bash
❌ Error: Account does not exist
💡 Solution: anchor build && anchor deploy --provider.cluster devnet
```

**Error**: `Program ID mismatch`
```bash
❌ Error: Program ID mismatch
💡 Solution: Check target/deploy/sloomo_portfolio-keypair.json
```

### Debug Commands

```bash
# Verbose test output
RUST_LOG=debug yarn test:unit

# Specific test file execution
yarn run ts-mocha tests/unit/portfolio_core.test.ts

# Test with detailed error messages
yarn test:unit --verbose

# Check anchor configuration
anchor config

# Verify program deployment
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC --url devnet
```

### Performance Optimization

#### Timeout Management

```bash
# Increase timeout for slow operations
yarn test:unit --timeout 60000

# Parallel test execution
yarn test:all --parallel
```

#### Resource Management

```bash
# Clean build artifacts
anchor clean

# Fresh dependency installation
rm -rf node_modules && yarn install

# Clear anchor cache
rm -rf .anchor
```

## 📊 Test Metrics and KPIs

### Performance Benchmarks

| Test Type | Target Duration | Actual Average | Pass Rate Target |
|-----------|----------------|----------------|------------------|
| Unit Tests | < 60s | 45s | > 99% |
| Integration Tests | < 5min | 3.2min | > 95% |
| Jupiter Tests | < 3min | 2.1min | > 90% |

### Quality Metrics

- **Code Coverage**: > 90% across all modules
- **Test Reliability**: < 1% flaky test rate
- **Performance**: No degradation > 10% between runs

## 🔄 Continuous Integration

### CI Pipeline Configuration

```yaml
# Example GitHub Actions configuration
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: yarn install
    - name: Run tests
      run: yarn test:all
      env:
        ANCHOR_PROVIDER_URL: https://api.devnet.solana.com
        ANCHOR_WALLET: ${{ secrets.ANCHOR_WALLET }}
```

### Pre-commit Hooks

```bash
# Install pre-commit testing
npx husky add .husky/pre-commit "yarn test:unit"

# Pre-push comprehensive testing
npx husky add .husky/pre-push "yarn test:all"
```

## 📚 Test Development Guidelines

### Writing New Tests

#### Test Structure Template

```typescript
describe("Feature Description", () => {
  beforeEach(async () => {
    // Setup test environment
  });

  it("should perform expected behavior", async () => {
    // Arrange
    const testData = setupTestData();
    
    // Act
    const result = await executeFunction(testData);
    
    // Assert
    expect(result).to.meet.expectedCriteria();
  });

  after(async () => {
    // Cleanup test environment
  });
});
```

#### Best Practices

- **Descriptive Names**: Use clear, behavior-focused test names
- **Isolation**: Each test should be independent
- **Cleanup**: Properly clean up test resources
- **Coverage**: Test both success and failure cases
- **Performance**: Keep tests efficient and fast

### Test Data Management

```typescript
// Use factories for consistent test data
export const createTestPortfolio = () => ({
  allocations: [
    { symbol: "AAPL", targetPercentage: 6000 },
    { symbol: "GOOGL", targetPercentage: 4000 }
  ]
});

// Mock external dependencies
const mockJupiterAPI = {
  getQuote: jest.fn().mockResolvedValue(mockQuoteResponse)
};
```

## 🎯 Success Criteria

### Test Completion Checklist

- [ ] All unit tests pass consistently
- [ ] Integration tests cover main user flows
- [ ] Error cases are properly handled
- [ ] Performance requirements are met
- [ ] Coverage targets are achieved
- [ ] Documentation is up to date

### Quality Gates

- **Automated**: All tests must pass before merge
- **Manual**: Code review with test validation
- **Performance**: No regression in test execution time
- **Coverage**: Maintain > 90% code coverage

---

**🧪 Testing Excellence**: This comprehensive testing suite ensures Sloomo Portfolio smart contracts maintain high quality, reliability, and performance standards throughout development and deployment.