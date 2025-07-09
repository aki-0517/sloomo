import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme/colors';

interface ActionButtonsProps {
  onEditPortfolio: () => void;
  onDeposit: () => void;
  onRebalance: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onEditPortfolio,
  onDeposit,
  onRebalance
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onEditPortfolio}>
        <Text style={styles.primaryButtonText}>Edit Portfolio</Text>
      </TouchableOpacity>
      
      <View style={styles.secondaryButtonsContainer}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onDeposit}>
          <Text style={styles.secondaryButtonText}>Deposit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onRebalance}>
          <Text style={styles.secondaryButtonText}>Rebalance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md
  },
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.sm
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButtonsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500'
  }
});