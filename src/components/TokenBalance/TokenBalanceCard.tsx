import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Icon } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface TokenBalanceCardProps {
  showCreditLine?: boolean;
  onPress?: () => void;
}

export const TokenBalanceCard: React.FC<TokenBalanceCardProps> = ({
  showCreditLine = false,
  onPress,
}) => {
  const { usdcBalance, balance: solBalance } = useSelector((state: RootState) => state.wallet);
  const { creditLine } = useSelector((state: RootState) => state.credit);

  const formatBalance = (amount: number, decimals: number = 2): string => {
    return amount.toFixed(decimals);
  };

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium">Balance</Text>
          <Icon source="refresh" size={20} />
        </View>
        
        <View style={styles.balanceContainer}>
          <View style={styles.balanceRow}>
            <View style={styles.tokenInfo}>
              <Icon source="currency-usd" size={24} />
              <Text variant="labelLarge">USDC</Text>
            </View>
            <Text variant="headlineSmall" style={styles.balanceAmount}>
              ${formatBalance(usdcBalance)}
            </Text>
          </View>

          <View style={styles.balanceRow}>
            <View style={styles.tokenInfo}>
              <Icon source="currency-eth" size={24} />
              <Text variant="labelLarge">SOL</Text>
            </View>
            <Text variant="headlineSmall" style={styles.balanceAmount}>
              {formatBalance(solBalance, 4)}
            </Text>
          </View>
        </View>

        {showCreditLine && creditLine && (
          <View style={styles.creditContainer}>
            <Text variant="titleSmall" style={styles.creditTitle}>
              Available Credit
            </Text>
            <Text variant="headlineSmall" style={styles.creditAmount}>
              ${formatBalance(creditLine.availableAmount)}
            </Text>
            <Text variant="bodySmall" style={styles.creditLimit}>
              of ${formatBalance(creditLine.totalAmount)} limit
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceContainer: {
    gap: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceAmount: {
    fontWeight: 'bold',
  },
  creditContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  creditTitle: {
    color: '#4CAF50',
    marginBottom: 4,
  },
  creditAmount: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  creditLimit: {
    color: '#666',
    marginTop: 4,
  },
});