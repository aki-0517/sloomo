import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AllocationPie } from '../components/portfolio/AllocationPie';
import { AllocationRow } from '../components/portfolio/AllocationRow';
import { AddAssetModal } from '../modals/AddAssetModal';
import { theme } from '../theme/colors';
import { Allocation, Stablecoin } from '../types/stablecoin';
import { mockAllocations, mockAssets } from '../utils/mock';

export const EditPortfolioScreen: React.FC = () => {
  const [draftTargets, setDraftTargets] = useState<Allocation[]>(mockAllocations);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigation = useNavigation();

  const handleTargetChange = (symbol: string, newTarget: number) => {
    setDraftTargets(prev => 
      prev.map(allocation => 
        allocation.symbol === symbol 
          ? { ...allocation, targetPct: newTarget }
          : allocation
      )
    );
  };

  const handleRemoveAsset = (symbol: string) => {
    setDraftTargets(prev => prev.filter(allocation => allocation.symbol !== symbol));
  };

  const getTotalTarget = () => {
    return draftTargets.reduce((sum, allocation) => sum + allocation.targetPct, 0);
  };

  const handleSave = () => {
    const total = getTotalTarget();
    if (Math.abs(total - 100) > 0.1) {
      Alert.alert('Invalid Allocation', 'Target percentages must total 100%');
      return;
    }
    
    Alert.alert('Success', 'Portfolio allocation updated successfully!');
  };

  const handleCancel = () => {
    setDraftTargets(mockAllocations);
    navigation.goBack();
  };

  const handleAddAsset = () => {
    setShowAddModal(true);
  };

  const handleAddAssetConfirm = (asset: Stablecoin) => {
    const newAllocation: Allocation = {
      symbol: asset.symbol,
      currentPct: 0,
      targetPct: 0
    };
    setDraftTargets(prev => [...prev, newAllocation]);
    setShowAddModal(false);
  };

  const renderAllocationRow = ({ item }: { item: Allocation }) => {
    const asset = mockAssets.find(asset => asset.symbol === item.symbol);
    
    return (
      <AllocationRow
        symbol={item.symbol}
        current={item.currentPct}
        target={item.targetPct}
        apy={asset?.apy || 0}
        onTargetChange={(value) => handleTargetChange(item.symbol, value)}
        onRemove={() => handleRemoveAsset(item.symbol)}
      />
    );
  };

  const totalTarget = getTotalTarget();
  const isValidAllocation = Math.abs(totalTarget - 100) < 0.1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Portfolio</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <AllocationPie data={draftTargets} animate />
        
        <View style={styles.allocationSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Allocations</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddAsset}>
              <Text style={styles.addButtonText}>+ Add Asset</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={draftTargets}
            renderItem={renderAllocationRow}
            keyExtractor={(item) => item.symbol}
            scrollEnabled={false}
          />
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Target:</Text>
            <Text style={[
              styles.totalValue,
              { color: isValidAllocation ? theme.colors.success : theme.colors.error }
            ]}>
              {totalTarget.toFixed(1)}%
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, { opacity: isValidAllocation ? 1 : 0.5 }]} 
          onPress={handleSave}
          disabled={!isValidAllocation}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
      
      <AddAssetModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddAssetConfirm}
        excludedAssets={draftTargets.map(a => a.symbol)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  backButton: {
    fontSize: 32,
    color: theme.colors.text,
    fontWeight: 'bold'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  placeholder: {
    width: 32
  },
  scrollView: {
    flex: 1
  },
  allocationSection: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  addButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md
  },
  addButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '600'
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  saveButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center'
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.surface
  }
});