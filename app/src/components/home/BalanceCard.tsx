import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/colors';

interface BalanceCardProps {
  balance: number;
  growth: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balance, growth }) => {
  const isPositive = growth >= 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Total Portfolio Value</Text>
      <Text style={styles.balance}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
      <View style={styles.growthContainer}>
        <Text style={[styles.growth, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
          {isPositive ? '+' : ''}{growth.toFixed(2)}%
        </Text>
        <Text style={styles.period}>Last 30 days</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  label: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm
  },
  growth: {
    fontSize: 16,
    fontWeight: '600'
  },
  period: {
    fontSize: 14,
    color: theme.colors.textSecondary
  }
});