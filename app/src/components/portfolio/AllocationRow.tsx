import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme/colors';

interface AllocationRowProps {
  symbol: string;
  current: number;
  target: number;
  apy: number;
  onTargetChange: (value: number) => void;
  onRemove: () => void;
}

export const AllocationRow: React.FC<AllocationRowProps> = ({
  symbol,
  current,
  target,
  apy,
  onTargetChange,
  onRemove
}) => {
  const handleTargetChange = (text: string) => {
    const value = parseFloat(text) || 0;
    if (value >= 0 && value <= 100) {
      onTargetChange(value);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.symbolContainer}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.apy}>{apy.toFixed(2)}% APY</Text>
      </View>
      
      <View style={styles.percentageContainer}>
        <View style={styles.percentageColumn}>
          <Text style={styles.percentageLabel}>Current</Text>
          <Text style={styles.percentageValue}>{current.toFixed(1)}%</Text>
        </View>
        
        <View style={styles.percentageColumn}>
          <Text style={styles.percentageLabel}>Target</Text>
          <TextInput
            style={styles.targetInput}
            value={target.toString()}
            onChangeText={handleTargetChange}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      </View>
      
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  symbolContainer: {
    flex: 1,
    marginRight: theme.spacing.sm
  },
  symbol: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs
  },
  apy: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '500'
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md
  },
  percentageColumn: {
    alignItems: 'center',
    minWidth: 60
  },
  percentageLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs
  },
  percentageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  targetInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    minWidth: 50
  },
  removeButton: {
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  removeButtonText: {
    fontSize: 20,
    color: theme.colors.error,
    fontWeight: 'bold'
  }
});