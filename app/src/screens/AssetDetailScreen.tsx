import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../theme/colors';
import { Stablecoin } from '../types/stablecoin';
import { mockAssets, mockTransactions } from '../utils/mock';

const { width } = Dimensions.get('window');

interface AssetDetailScreenProps {
  route: {
    params: {
      symbol: string;
    };
  };
}

const StatsTab = ({ asset }: { asset: Stablecoin }) => (
  <View style={styles.tabContent}>
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>APY</Text>
      <Text style={styles.statValue}>{asset.apy.toFixed(2)}%</Text>
    </View>
    
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>TVL</Text>
      <Text style={styles.statValue}>${(asset.tvl / 1_000_000).toFixed(1)}M</Text>
    </View>
    
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>Protocol</Text>
      <Text style={styles.statValue}>{asset.symbol.split('-')[1] || 'Unknown'}</Text>
    </View>
  </View>
);

const ChartTab = ({ asset }: { asset: Stablecoin }) => {
  const mockApyData = [
    { day: '7/1', value: asset.apy - 0.3 },
    { day: '7/2', value: asset.apy - 0.2 },
    { day: '7/3', value: asset.apy - 0.1 },
    { day: '7/4', value: asset.apy + 0.1 },
    { day: '7/5', value: asset.apy },
    { day: '7/6', value: asset.apy + 0.2 },
    { day: '7/7', value: asset.apy + 0.1 },
    { day: '7/8', value: asset.apy - 0.1 },
    { day: '7/9', value: asset.apy }
  ];

  const maxValue = Math.max(...mockApyData.map(d => d.value));
  const minValue = Math.min(...mockApyData.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.chartTitle}>APY History</Text>
      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{maxValue.toFixed(1)}%</Text>
          <Text style={styles.axisLabel}>{((maxValue + minValue) / 2).toFixed(1)}%</Text>
          <Text style={styles.axisLabel}>{minValue.toFixed(1)}%</Text>
        </View>
        <View style={styles.chartArea}>
          <View style={styles.gridLines}>
            <View style={[styles.gridLine, { top: 0 }]} />
            <View style={[styles.gridLine, { top: '50%' }]} />
            <View style={[styles.gridLine, { bottom: 0 }]} />
          </View>
          <View style={styles.lineContainer}>
            {mockApyData.map((point, index) => {
              const x = (index / (mockApyData.length - 1)) * 100;
              const y = range > 0 ? ((point.value - minValue) / range) * 100 : 50;
              return (
                <View
                  key={index}
                  style={[
                    styles.dataPoint,
                    {
                      left: `${x}%`,
                      bottom: `${y}%`,
                      backgroundColor: theme.colors.secondary,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.xAxis}>
        <Text style={styles.axisLabel}>7/1</Text>
        <Text style={styles.axisLabel}>7/5</Text>
        <Text style={styles.axisLabel}>7/9</Text>
      </View>
    </View>
  );
};

const HistoryTab = () => (
  <View style={styles.tabContent}>
    <Text style={styles.historyTitle}>Recent Transactions</Text>
    {mockTransactions.map((transaction, index) => (
      <View key={transaction.id} style={styles.transactionItem}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDate}>{transaction.date}</Text>
          <Text style={styles.transactionAction}>{transaction.action}</Text>
        </View>
        <View style={styles.transactionRight}>
          <Text style={styles.transactionAmount}>{transaction.amount}</Text>
          <Text style={[
            styles.transactionStatus,
            { 
              color: transaction.status === 'Confirmed' ? theme.colors.success : 
                     transaction.status === 'Pending' ? theme.colors.warning : 
                     theme.colors.error 
            }
          ]}>
            {transaction.status}
          </Text>
        </View>
      </View>
    ))}
  </View>
);

export const AssetDetailScreen: React.FC<AssetDetailScreenProps> = ({ route }) => {
  const { symbol } = route.params;
  const asset = mockAssets.find(a => a.symbol === symbol);
  
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { key: 'stats', title: 'Stats' },
    { key: 'chart', title: 'Chart' },
    { key: 'history', title: 'History' }
  ];

  if (!asset) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Asset not found</Text>
      </View>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return <StatsTab asset={asset} />;
      case 1:
        return <ChartTab asset={asset} />;
      case 2:
        return <HistoryTab />;
      default:
        return <StatsTab asset={asset} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{asset.name}</Text>
        <Text style={styles.symbol}>{asset.symbol}</Text>
      </View>
      
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === index && styles.activeTabItem
            ]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[
              styles.tabLabel,
              activeTab === index && styles.activeTabLabel
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.content}>
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs
  },
  symbol: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabLabel: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center'
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    marginVertical: theme.spacing.md,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: theme.spacing.sm,
    width: 60,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  lineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dataPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginBottom: -3,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 60,
  },
  axisLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md
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
  transactionInfo: {
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
    color: theme.colors.text,
    marginBottom: theme.spacing.xs
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '500'
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.xl
  }
});