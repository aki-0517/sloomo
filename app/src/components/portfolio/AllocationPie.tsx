import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { theme } from '../../theme/colors';
import { Allocation } from '../../types/stablecoin';

const { width } = Dimensions.get('window');

interface AllocationPieProps {
  data: Allocation[];
  animate?: boolean;
}

const colors = [
  theme.colors.primary,
  theme.colors.secondary,
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#84CC16'
];

export const AllocationPie: React.FC<AllocationPieProps> = ({ data, animate = true }) => {
  const total = data.reduce((sum, item) => sum + item.targetPct, 0);
  
  return (
    <View style={styles.container}>
      <View style={styles.pieContainer}>
        <View style={styles.legendContainer}>
          {data.map((allocation, index) => (
            <View key={allocation.symbol} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: colors[index % colors.length] }
                ]} 
              />
              <Text style={styles.legendText}>
                {allocation.symbol}: {allocation.targetPct}%
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.pieChart}>
          <View style={styles.pieCenter}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalValue}>{total}%</Text>
          </View>
          
          <View style={styles.pieSegments}>
            {data.map((allocation, index) => {
              const percentage = (allocation.targetPct / total) * 100;
              return (
                <View
                  key={allocation.symbol}
                  style={[
                    styles.pieSegment,
                    {
                      backgroundColor: colors[index % colors.length],
                      height: `${percentage}%`,
                    }
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  pieContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendContainer: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: theme.spacing.sm,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  pieChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pieCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  totalText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  pieSegments: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    overflow: 'hidden',
  },
  pieSegment: {
    width: '100%',
  },
});