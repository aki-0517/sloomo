import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme/colors';

interface ActionButtonsProps {
  onEditPortfolio: () => void;
  onDeposit: () => void;
  onRebalance: () => void;
  onInitialize?: () => void;
  onRefresh?: () => void;
  showInitialize?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onEditPortfolio,
  onDeposit,
  onRebalance,
  onInitialize,
  onRefresh,
  showInitialize = false
}) => {
  return (
    <View style={styles.container}>
      {showInitialize && onInitialize ? (
        <View style={styles.primaryButtonsContainer}>
          <TouchableOpacity style={[styles.button, styles.initializeButton]} onPress={onInitialize}>
            <Text style={styles.initializeButtonText}>Initialize Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.editButton]} onPress={onEditPortfolio}>
            <Text style={styles.editButtonText}>Edit Allocation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onEditPortfolio}>
          <Text style={styles.primaryButtonText}>Edit Allocation</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.secondaryButtonsContainer}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onDeposit}>
          <Text style={styles.secondaryButtonText}>Deposit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onRebalance}>
          <Text style={styles.secondaryButtonText}>Rebalance</Text>
        </TouchableOpacity>
      </View>
      
      {showInitialize && onRefresh && (
        <TouchableOpacity style={[styles.button, styles.refreshButton]} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh Portfolio</Text>
        </TouchableOpacity>
      )}
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
  primaryButtonsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm
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
  },
  initializeButton: {
    flex: 1,
    backgroundColor: theme.colors.success
  },
  initializeButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600'
  },
  editButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primary
  },
  editButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600'
  },
  refreshButton: {
    backgroundColor: theme.colors.surfaceVariant,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  refreshButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500'
  }
});