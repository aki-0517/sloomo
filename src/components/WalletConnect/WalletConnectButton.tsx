import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { connectWallet, disconnectWallet } from '../../store/walletSlice';
import { RootState } from '../../store';

interface WalletConnectButtonProps {
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onConnected,
  onDisconnected,
}) => {
  const dispatch = useDispatch();
  const { isConnected, publicKey, isLoading } = useSelector((state: RootState) => state.wallet);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await dispatch(connectWallet()).unwrap();
      onConnected?.();
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect wallet. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectWallet()).unwrap();
      onDisconnected?.();
    } catch (error) {
      Alert.alert('Disconnection Error', 'Failed to disconnect wallet.');
    }
  };

  if (isLoading || connecting) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>
          {connecting ? 'Connecting...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isConnected ? (
        <View style={styles.connectedContainer}>
          <Text style={styles.connectedText}>
            Connected: {publicKey?.substring(0, 4)}...{publicKey?.substring(publicKey.length - 4)}
          </Text>
          <Button
            mode="outlined"
            onPress={handleDisconnect}
            style={styles.disconnectButton}
          >
            Disconnect
          </Button>
        </View>
      ) : (
        <Button
          mode="contained"
          onPress={handleConnect}
          style={styles.connectButton}
          icon="wallet"
        >
          Connect Wallet
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  connectedContainer: {
    alignItems: 'center',
  },
  connectedText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#4CAF50',
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
  },
  connectButton: {
    marginTop: 8,
  },
  disconnectButton: {
    marginTop: 8,
  },
});