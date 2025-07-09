import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme/colors';
import { Transaction } from '../types/stablecoin';
import { mockTransactions } from '../utils/mock';

export const TxHistoryScreen: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw' | 'rebalance'>('all');
  
  const filteredTransactions = mockTransactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.action.toLowerCase().includes(filter);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return theme.colors.success;
      case 'Pending': return theme.colors.warning;
      case 'Failed': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getAmountColor = (amount: string) => {
    return amount.startsWith('+') ? theme.colors.success : theme.colors.error;
  };

  const renderFilterButton = (filterType: typeof filter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionDate}>{item.date}</Text>
        <Text style={styles.transactionAction}>{item.action}</Text>
      </View>
      
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: getAmountColor(item.amount) }
        ]}>
          {item.amount}
        </Text>
        <Text style={[
          styles.transactionStatus,
          { color: getStatusColor(item.status) }
        ]}>
          {item.status}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('deposit', 'Deposit')}
        {renderFilterButton('withdraw', 'Withdraw')}
        {renderFilterButton('rebalance', 'Rebalance')}
      </View>
      
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        style={styles.transactionList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your filter or check back later
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  activeFilterButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  activeFilterButtonText: {
    color: theme.colors.surface
  },
  transactionList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  transactionLeft: {
    flex: 1
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs
  },
  transactionAction: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  transactionRight: {
    alignItems: 'flex-end'
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.xs
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '500'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl * 2
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center'
  }
});