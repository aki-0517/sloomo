import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native-paper';
import { PublicKey } from '@solana/web3.js';
import { AllocationPie } from '../components/portfolio/AllocationPie';
import { AllocationRow } from '../components/portfolio/AllocationRow';
import { AddAssetModal } from '../modals/AddAssetModal';
import { useContract } from '../hooks/useContract';
import { usePortfolioContext, TempAllocation } from '../context/PortfolioContext';
import { theme } from '../theme/colors';
import { Allocation, Stablecoin } from '../types/stablecoin';
import { mockAssets } from '../utils/mock';

export const EditPortfolioScreen: React.FC = () => {
  const [draftTargets, setDraftTargets] = useState<Allocation[]>([]);
  const [originalAllocations, setOriginalAllocations] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigation = useNavigation();
  const contract = useContract();
  const { tempPortfolio, updateTempAllocation, clearTempPortfolio } = usePortfolioContext();

  // Load portfolio data when component mounts
  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      // First, check if we have a temporary portfolio
      if (tempPortfolio) {
        console.log('Loading from temporary portfolio...');
        const allocations = tempPortfolio.allocations.map((allocation: TempAllocation) => ({
          symbol: allocation.symbol,
          currentPct: allocation.currentPct || 0,
          targetPct: allocation.targetPct,
        }));
        setDraftTargets(allocations);
        setIsLoading(false);
        return;
      }

      // If no temporary portfolio and contract is available, load from contract
      if (contract) {
        const portfolioData = await contract.getPortfolioData();
        if (portfolioData && portfolioData.allocations) {
          setOriginalAllocations(portfolioData.allocations);
          
          // Convert contract data to UI format
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
          
          setDraftTargets(allocations);
        } else {
          // No portfolio data, start with default allocations
          const defaultAllocations = [
            { symbol: 'SOL', currentPct: 0, targetPct: 60 },
            { symbol: 'USDC', currentPct: 0, targetPct: 40 },
          ];
          setDraftTargets(defaultAllocations);
        }
      } else {
        // No contract, start with default allocations
        const defaultAllocations = [
          { symbol: 'SOL', currentPct: 0, targetPct: 60 },
          { symbol: 'USDC', currentPct: 0, targetPct: 40 },
        ];
        setDraftTargets(defaultAllocations);
      }
    } catch (error) {
      console.error('Error loading portfolio data:', error);
      // On error, start with default allocations
      const defaultAllocations = [
        { symbol: 'SOL', currentPct: 0, targetPct: 60 },
        { symbol: 'USDC', currentPct: 0, targetPct: 40 },
      ];
      setDraftTargets(defaultAllocations);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTargetChange = (symbol: string, newTarget: number) => {
    const updatedTargets = draftTargets.map(allocation => 
      allocation.symbol === symbol 
        ? { ...allocation, targetPct: newTarget }
        : allocation
    );
    setDraftTargets(updatedTargets);
    
    // Save to temporary storage immediately
    saveTempAllocations(updatedTargets);
  };

  const saveTempAllocations = (allocations: Allocation[]) => {
    const tempAllocations: TempAllocation[] = allocations.map(allocation => ({
      symbol: allocation.symbol,
      mint: getMintForSymbol(allocation.symbol),
      targetPct: allocation.targetPct,
      currentPct: allocation.currentPct,
    }));
    
    updateTempAllocation(tempAllocations);
  };

  const getMintForSymbol = (symbol: string): string => {
    // Map symbols to their mint addresses
    const mintMap: { [key: string]: string } = {
      'SOL': 'So11111111111111111111111111111111111111112',
      'USDC': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    };
    return mintMap[symbol] || '';
  };

  const handleRemoveAsset = (symbol: string) => {
    const updatedTargets = draftTargets.filter(allocation => allocation.symbol !== symbol);
    setDraftTargets(updatedTargets);
    saveTempAllocations(updatedTargets);
  };

  const getTotalTarget = () => {
    return draftTargets.reduce((sum, allocation) => sum + allocation.targetPct, 0);
  };

  const handleSave = async () => {
    const total = getTotalTarget();
    if (Math.abs(total - 100) > 0.1) {
      Alert.alert('Invalid Allocation', 'Target percentages must total 100%');
      return;
    }

    if (!contract) {
      Alert.alert('Error', 'Contract not initialized');
      return;
    }

    setIsSaving(true);
    
    try {
      // Update each allocation that has changed
      for (const allocation of draftTargets) {
        const originalAllocation = originalAllocations.find(
          (orig: any) => orig.symbol === allocation.symbol
        );
        
        if (originalAllocation) {
          const newTargetBasisPoints = Math.round(allocation.targetPct * 100); // Convert to basis points
          const originalTargetBasisPoints = originalAllocation.targetPercentage;
          
          if (newTargetBasisPoints !== originalTargetBasisPoints) {
            console.log(`Updating ${allocation.symbol} from ${originalTargetBasisPoints} to ${newTargetBasisPoints} basis points`);
            
            const mint = new PublicKey(originalAllocation.mint.toString());
            await contract.updateAllocation(allocation.symbol, mint, newTargetBasisPoints);
          }
        }
      }

      // Clear temporary portfolio since we've saved to contract
      clearTempPortfolio();
      
      Alert.alert(
        'Success', 
        'Portfolio allocation updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error updating allocations:', error);
      Alert.alert('Error', `Failed to update allocations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
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
    const updatedTargets = [...draftTargets, newAllocation];
    setDraftTargets(updatedTargets);
    saveTempAllocations(updatedTargets);
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio data...</Text>
      </View>
    );
  }

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
          style={[styles.saveButton, { opacity: isValidAllocation && !isSaving ? 1 : 0.5 }]} 
          onPress={handleSave}
          disabled={!isValidAllocation || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
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