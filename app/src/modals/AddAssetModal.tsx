import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Image } from 'react-native';
import { theme } from '../theme/colors';
import { Stablecoin } from '../types/stablecoin';
import { mockAssets } from '../utils/mock';

interface AddAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (asset: Stablecoin) => void;
  excludedAssets?: string[];
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  visible,
  onClose,
  onAdd,
  excludedAssets = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredAssets = mockAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const isNotExcluded = !excludedAssets.includes(asset.symbol);
    return matchesSearch && isNotExcluded;
  });

  const handleAddAsset = (asset: Stablecoin) => {
    onAdd(asset);
    onClose();
  };

  const renderAssetCard = ({ item }: { item: Stablecoin }) => (
    <View style={styles.assetCard}>
      <View style={styles.assetInfo}>
        <View style={styles.assetHeader}>
          <Text style={styles.assetSymbol}>{item.symbol}</Text>
          <Text style={styles.assetApy}>{item.apy.toFixed(2)}% APY</Text>
        </View>
        <Text style={styles.assetName}>{item.name}</Text>
        <Text style={styles.assetTvl}>TVL: ${(item.tvl / 1_000_000).toFixed(1)}M</Text>
      </View>
      
      <TouchableOpacity style={styles.addButton} onPress={() => handleAddAsset(item)}>
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Asset</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search stablecoin..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textSecondary}
        />
        
        {filteredAssets.length > 0 ? (
          <FlatList
            data={filteredAssets}
            renderItem={renderAssetCard}
            keyExtractor={(item) => item.symbol}
            style={styles.assetList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No results</Text>
            <Text style={styles.emptyStateSubtext}>Try searching for a different stablecoin</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.lg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  closeButton: {
    fontSize: 32,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.sm
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  assetList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md
  },
  assetCard: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  assetInfo: {
    flex: 1,
    marginRight: theme.spacing.md
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs
  },
  assetSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  assetApy: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary
  },
  assetName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs
  },
  assetTvl: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md
  },
  addButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '600'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl
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