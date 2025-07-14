import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AllocationPie } from '../portfolio/AllocationPie';
import { theme } from '../../theme/colors';
import { TempAllocation } from '../../context/PortfolioContext';

interface PortfolioDisplayProps {
  portfolioData?: any;
  tempPortfolio?: {
    allocations: TempAllocation[];
    totalValue: number;
    isTemporary: boolean;
    lastUpdated: Date;
    isSaved?: boolean;
  } | null;
}

export const PortfolioDisplay: React.FC<PortfolioDisplayProps> = ({
  portfolioData,
  tempPortfolio
}) => {
  // Determine what data to display - prioritize temporary portfolio if available
  const getDisplayData = () => {
    // First check for temporary portfolio data (session changes)
    if (tempPortfolio && tempPortfolio.allocations.length > 0) {
      // Temporary portfolio data (unsaved changes from edit screen)
      const allocations = tempPortfolio.allocations.map((allocation: TempAllocation) => ({
        symbol: allocation.symbol,
        currentPct: allocation.currentPct || 0,
        targetPct: allocation.targetPct,
      }));
      return { allocations, isTemporary: true };
    }
    
    // Then check for real portfolio data from contract
    if (portfolioData && portfolioData.allocations) {
      // Real portfolio data from contract
      const allocations = portfolioData.allocations.map((allocation: any) => {
        const currentPercentage = portfolioData.totalValue.toNumber() > 0
          ? (allocation.currentAmount.toNumber() / portfolioData.totalValue.toNumber()) * 100
          : 0;

        return {
          symbol: allocation.symbol,
          currentPct: currentPercentage,
          targetPct: allocation.targetPercentage / 100, // Convert from basis points
        };
      });
      return { allocations, isTemporary: false };
    }
    
    // Default data when no portfolio exists
    return {
      allocations: [
        { symbol: 'GOOGLx', currentPct: 0, targetPct: 60 },
        { symbol: 'COINx', currentPct: 0, targetPct: 40 },
      ],
      isTemporary: false
    };
  };

  const { allocations, isTemporary } = getDisplayData();

  const getStatusMessage = () => {
    if (portfolioData) {
      return {
        title: '✅ Active Portfolio',
        subtitle: 'Your portfolio is initialized and ready for deposits.',
        titleColor: theme.colors.success,
      };
    }
    
    if (tempPortfolio) {
      if (tempPortfolio.isSaved) {
        return {
          title: '✅ Updated Portfolio',
          subtitle: 'Your portfolio changes have been saved successfully.',
          titleColor: theme.colors.success,
        };
      } else {
        return {
          title: '📝 Draft Portfolio',
          subtitle: 'You have unsaved allocation changes. Initialize to save permanently.',
          titleColor: theme.colors.warning,
        };
      }
    }
    
    return {
      title: '🎯 Default Portfolio',
      subtitle: 'Initialize your portfolio to start managing your investments.',
      titleColor: theme.colors.textSecondary,
    };
  };

  const statusMessage = getStatusMessage();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: statusMessage.titleColor }]}>
          {statusMessage.title}
        </Text>
        <Text style={styles.subtitle}>
          {statusMessage.subtitle}
        </Text>
        {tempPortfolio && (
          <Text style={styles.lastUpdated}>
            Last updated: {tempPortfolio.lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>
      
      <AllocationPie data={allocations} animate={true} />
      
      <View style={styles.allocationsList}>
        <Text style={styles.allocationsTitle}>Current Allocation</Text>
        {allocations.map((allocation, index) => (
          <View key={index} style={styles.allocationRow}>
            <Text style={styles.allocationSymbol}>{allocation.symbol}</Text>
            <View style={styles.allocationDetails}>
              <Text style={styles.allocationTarget}>{allocation.targetPct.toFixed(1)}%</Text>
              {allocation.currentPct > 0 && (
                <Text style={styles.allocationCurrent}>
                  (Current: {allocation.currentPct.toFixed(1)}%)
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  allocationsList: {
    marginTop: theme.spacing.lg,
  },
  allocationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  allocationSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  allocationDetails: {
    alignItems: 'flex-end',
  },
  allocationTarget: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  allocationCurrent: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});