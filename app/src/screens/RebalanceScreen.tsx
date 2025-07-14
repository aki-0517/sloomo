import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Button, Card, ActivityIndicator, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useContract } from '../hooks/useContract';
import { theme } from '../theme/colors';

interface AllocationData {
  symbol: string;
  currentAmount: number;
  targetPercentage: number;
  currentPercentage: number;
  mint: string;
}

export function RebalanceScreen() {
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [slippage, setSlippage] = useState('50'); // 0.5% default
  const [isLoading, setIsLoading] = useState(true);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const navigation = useNavigation();
  const contract = useContract();

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    if (!contract) return;

    try {
      const data = await contract.getPortfolioData();
      if (!data) {
        Alert.alert('Error', 'Portfolio not found. Please initialize your portfolio first.');
        navigation.goBack();
        return;
      }

      setPortfolioData(data);
      
      const processedAllocations = data.allocations.map((allocation: any) => {
        const currentPercentage = data.totalValue.toNumber() > 0
          ? (allocation.currentAmount.toNumber() / data.totalValue.toNumber()) * 100
          : 0;

        return {
          symbol: allocation.symbol,
          currentAmount: allocation.currentAmount.toNumber(),
          targetPercentage: allocation.targetPercentage / 100,
          currentPercentage,
          mint: allocation.mint.toString(),
        };
      });

      setAllocations(processedAllocations);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      Alert.alert('Error', 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  const needsRebalancing = () => {
    const threshold = 5; // 5% threshold
    return allocations.some(allocation => 
      Math.abs(allocation.currentPercentage - allocation.targetPercentage) > threshold
    );
  };

  const handleRebalance = async () => {
    if (!contract) {
      Alert.alert('Error', 'Contract not initialized');
      return;
    }

    const slippageBps = parseInt(slippage);
    if (isNaN(slippageBps) || slippageBps < 1 || slippageBps > 10000) {
      Alert.alert('Error', 'Invalid slippage value (1-10000 bps)');
      return;
    }

    if (!needsRebalancing()) {
      Alert.alert('Info', 'Portfolio is already balanced within the 5% threshold');
      return;
    }

    Alert.alert(
      'Confirm Rebalance',
      `This will rebalance your portfolio with ${slippageBps / 100}% slippage. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: executeRebalance }
      ]
    );
  };

  const executeRebalance = async () => {
    if (!contract) return;

    setIsRebalancing(true);
    try {
      const slippageBps = parseInt(slippage);
      const signature = await contract.rebalancePortfolio(slippageBps);

      Alert.alert(
        'Success',
        'Portfolio rebalanced successfully!',
        [
          {
            text: 'View Transaction',
            onPress: () => {
              console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
            }
          },
          {
            text: 'OK',
            onPress: () => {
              loadPortfolioData(); // Reload data
            }
          }
        ]
      );
    } catch (error) {
      console.error('Rebalance error:', error);
      Alert.alert('Error', `Rebalancing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRebalancing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading portfolio data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Rebalance Portfolio
          </Text>

          {portfolioData && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Portfolio Summary</Text>
              <Text style={styles.summaryText}>
                Total Value: {(portfolioData.totalValue.toNumber() / 1_000_000_000).toFixed(4)} SOL
              </Text>
              <Text style={styles.summaryText}>
                Assets: {allocations.length}
              </Text>
              <Text style={styles.summaryText}>
                Needs Rebalancing: {needsRebalancing() ? 'Yes' : 'No'}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Current Allocations</Text>
          {allocations.map((allocation, index) => (
            <Card key={index} style={styles.allocationCard}>
              <Card.Content>
                <View style={styles.allocationHeader}>
                  <Text style={styles.allocationSymbol}>{allocation.symbol}</Text>
                  <Text style={[
                    styles.differenceText,
                    Math.abs(allocation.currentPercentage - allocation.targetPercentage) > 5 
                      ? styles.differenceHighlight 
                      : styles.differenceNormal
                  ]}>
                    {Math.abs(allocation.currentPercentage - allocation.targetPercentage).toFixed(1)}% diff
                  </Text>
                </View>
                <View style={styles.allocationDetails}>
                  <Text>Current: {allocation.currentPercentage.toFixed(1)}%</Text>
                  <Text>Target: {allocation.targetPercentage.toFixed(1)}%</Text>
                </View>
              </Card.Content>
            </Card>
          ))}

          <Text style={styles.sectionTitle}>Slippage Tolerance</Text>
          <TextInput
            style={styles.slippageInput}
            mode="outlined"
            value={slippage}
            onChangeText={setSlippage}
            placeholder="Slippage in basis points"
            keyboardType="numeric"
            right={<TextInput.Affix text="bps" />}
          />
          <Text style={styles.slippageHelp}>
            Current: {parseInt(slippage) / 100}% (1 bps = 0.01%)
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleRebalance}
              disabled={isRebalancing || portfolioData?.isRebalancing}
              loading={isRebalancing}
              style={[
                styles.rebalanceButton,
                needsRebalancing() ? styles.rebalanceNeeded : styles.rebalanceNotNeeded
              ]}
            >
              {portfolioData?.isRebalancing 
                ? 'Rebalancing in Progress...' 
                : needsRebalancing() 
                  ? 'Rebalance Portfolio'
                  : 'Portfolio Balanced'
              }
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={isRebalancing}
            >
              Back
            </Button>
          </View>

          <Text style={styles.warningText}>
            ⚠️ Rebalancing will execute trades on Jupiter DEX. Make sure you have sufficient SOL for transaction fees.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  card: {
    marginTop: theme.spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    color: theme.colors.primary,
  },
  summaryContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  allocationCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  allocationSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  differenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  differenceHighlight: {
    color: theme.colors.error,
  },
  differenceNormal: {
    color: theme.colors.success,
  },
  allocationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slippageInput: {
    marginBottom: theme.spacing.sm,
  },
  slippageHelp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  rebalanceButton: {
    marginBottom: theme.spacing.sm,
  },
  rebalanceNeeded: {
    backgroundColor: theme.colors.primary,
  },
  rebalanceNotNeeded: {
    backgroundColor: theme.colors.success,
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontStyle: 'italic',
  },
});