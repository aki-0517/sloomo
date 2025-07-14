import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert, Image, TouchableOpacity } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAuthorization } from "../utils/useAuthorization";
import { SignInFeature } from "../components/sign-in/sign-in-feature";
import { BalanceCard } from "../components/home/BalanceCard";
import { LineChart } from "../components/home/LineChart";
import { ActionButtons } from "../components/home/ActionButtons";
import { PortfolioDisplay } from "../components/home/PortfolioDisplay";
import { mockPortfolio, mockChartData } from "../utils/mock";
import { useContract } from "../hooks/useContract";
import { usePortfolioContext } from "../context/PortfolioContext";
import { theme } from "../theme/colors";
import { useMobileWallet } from "../utils/useMobileWallet";
import { useConnection } from "../hooks/useConnection";

console.log('HomeScreen module loading...');

export function HomeScreen() {
  console.log('HomeScreen component rendering...');
  
  try {
    const { selectedAccount } = useAuthorization();
    const navigation = useNavigation();
    const contract = useContract();
    const { tempPortfolio } = usePortfolioContext();
    const [portfolioData, setPortfolioData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasInitializeAttempted, setHasInitializeAttempted] = useState(false);
    const { signAndSendTransaction } = useMobileWallet();
    const { connection } = useConnection();
    
    console.log('selectedAccount:', selectedAccount);

    // Check if portfolio exists when wallet is connected
    useEffect(() => {
      if (selectedAccount && contract) {
        checkPortfolio();
      }
    }, [selectedAccount, contract]);

    const checkPortfolio = async () => {
      if (!contract) {
        console.log('❌ No contract available for checkPortfolio');
        return;
      }
      
      console.log('🔍 checkPortfolio called - starting...');
      setIsLoading(true);
      try {
        console.log('🔍 Checking portfolio data...');
        const data = await contract.getPortfolioData();
        console.log('📊 Portfolio data result:', data);
        console.log('📊 Setting portfolioData state to:', data);
        setPortfolioData(data);
        
        if (data) {
          console.log('✅ Portfolio found - should show Rebalance button');
          console.log('📊 Portfolio total value:', data.totalValue?.toString());
          console.log('📊 Portfolio allocations:', data.allocations?.length);
          console.log('🔘 Button should be: REBALANCE');
        } else {
          console.log('❌ No portfolio found - should show Initialize button');
          console.log('🔘 Button should be: INITIALIZE');
        }
      } catch (error) {
        console.error('❌ Error checking portfolio:', error);
        setPortfolioData(null);
        console.log('🔘 Button should be: INITIALIZE (due to error)');
      } finally {
        setIsLoading(false);
        console.log('🔍 checkPortfolio completed');
      }
    };

    const handleInitializePortfolio = async () => {
      if (!contract) {
        Alert.alert('Error', 'Contract not initialized. Please connect your wallet.');
        return;
      }

      Alert.alert(
        'Initialize Portfolio',
        'This will create a new portfolio with 0.1 SOL deposit and GOOGLx (60%) / COINx (40%) allocation. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Initialize', onPress: executeInitialization }
        ]
      );
    };

    const executeInitialization = async () => {
      if (!contract) return;

      try {
        // Mark initialization as attempted (even if it fails)
        setHasInitializeAttempted(true);
        
        // Initialize portfolio with 0.1 SOL
        const signature = await contract.initializePortfolio(0.1);
        console.log('✅ Portfolio initialized successfully with signature:', signature);
        
        // Immediately check portfolio after initialization
        console.log('🔄 Checking portfolio immediately after initialization...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        await checkPortfolio();
        
        Alert.alert(
          'Success',
          `Portfolio initialized successfully with 0.1 SOL deposit!\n\nTransaction: ${signature}`,
          [
            {
              text: 'View on Explorer',
              onPress: () => {
                console.log(`🔗 Opening transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
                // In a real app, you would open the URL using Linking.openURL()
              }
            },
            {
              text: 'OK',
              onPress: () => {
                console.log('🔄 Final portfolio check after user confirms...');
                setTimeout(() => checkPortfolio(), 1000);
              }
            }
          ]
        );
      } catch (error) {
        console.error('Portfolio initialization error:', error);
        
        // Keep initialization as attempted even on failure
        setHasInitializeAttempted(true);
        
        // Check if it's a timeout error
        if (error instanceof Error && error.message.includes('Transaction was not confirmed')) {
          const signatureMatch = error.message.match(/signature ([a-zA-Z0-9]+)/);
          const signature = signatureMatch ? signatureMatch[1] : null;
          
          Alert.alert(
            'Transaction Timeout',
            `The transaction might have succeeded but took longer than expected to confirm.\n\n${signature ? `Check status at: https://explorer.solana.com/tx/${signature}?cluster=devnet` : 'Please check your transaction history.'}`,
            [
              {
                text: 'Check Portfolio',
                onPress: () => {
                  console.log('🔄 Checking portfolio after timeout...');
                  setTimeout(() => checkPortfolio(), 1000);
                }
              },
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Error', `Portfolio initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    const handleEditPortfolio = () => {
      navigation.navigate('EditPortfolio' as never);
    };

    const handleDeposit = () => {
      navigation.navigate('Deposit' as never);
    };

    const handleRebalance = () => {
      navigation.navigate('Rebalance' as never);
    };

    const handleMockRebalance = async () => {
      if (!selectedAccount || !connection || !signAndSendTransaction) {
        Alert.alert('Error', 'Wallet not connected or not available');
        return;
      }

      try {
        console.log('🎭 Starting mock rebalance with empty transaction...');
        
        // Create an empty transaction (just a memo instruction or minimal SOL transfer)
        const transaction = new Transaction();
        
        // Add a very small SOL transfer to self (0.000001 SOL) to make it a valid transaction
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: selectedAccount.publicKey,
            toPubkey: selectedAccount.publicKey,
            lamports: 1000, // 0.000001 SOL
          })
        );

        // Get the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = selectedAccount.publicKey;

        console.log('🔐 Sending mock rebalance transaction...');
        const signature = await signAndSendTransaction(transaction);
        console.log('✅ Mock rebalance transaction sent:', signature);

        Alert.alert(
          'Mock Rebalance Complete',
          `Mock rebalance transaction sent successfully!\n\nTransaction: ${signature}`,
          [
            {
              text: 'View on Explorer',
              onPress: () => {
                console.log(`🔗 Opening transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
              }
            },
            {
              text: 'OK'
            }
          ]
        );
      } catch (error) {
        console.error('Mock rebalance error:', error);
        
        // Handle different error types
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : '';
        
        if (errorMessage.includes('CancellationException') || 
            errorMessage.includes('User cancelled') ||
            errorName.includes('SolanaMobileWalletAdapterError') ||
            errorMessage.includes('java.util.concurrent.CancellationException')) {
          console.log('🚫 User cancelled the transaction');
          Alert.alert('Transaction Cancelled', 'The transaction was cancelled by the user.');
        } else {
          Alert.alert('Error', `Mock rebalance failed: ${errorMessage}`);
        }
      }
    };

    return (
      <View style={styles.screenContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/sloomo-logo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        {selectedAccount ? (
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Checking portfolio...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <BalanceCard 
                balance={portfolioData?.totalValue?.toNumber() || 0} 
                growth={mockPortfolio.growth} // TODO: Calculate real growth
              />
              <LineChart data={mockChartData} period="1M" />
              
              <PortfolioDisplay
                portfolioData={portfolioData}
                tempPortfolio={tempPortfolio}
              />
              
              <ActionButtons 
                onEditPortfolio={handleEditPortfolio}
                onDeposit={handleDeposit}
                onRebalance={!!portfolioData || !!tempPortfolio ? handleRebalance : handleMockRebalance}
                onInitialize={handleInitializePortfolio}
                isInitialized={!!portfolioData || !!tempPortfolio || hasInitializeAttempted}
              />
              
              {/* Debug state information */}
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>
                  🔘 Button State: {(!!portfolioData || !!tempPortfolio || hasInitializeAttempted) ? 'REBALANCE' : 'INITIALIZE'}
                </Text>
                <Text style={styles.debugText}>
                  📊 portfolioData: {portfolioData ? 'EXISTS' : 'NULL'}
                </Text>
                <Text style={styles.debugText}>
                  📝 tempPortfolio: {tempPortfolio ? 'EXISTS' : 'NULL'}
                </Text>
                <Text style={styles.debugText}>
                  🔍 isInitialized: {String(!!portfolioData || !!tempPortfolio || hasInitializeAttempted)}
                </Text>
                <Text style={styles.debugText}>
                  🎯 hasInitializeAttempted: {String(hasInitializeAttempted)}
                </Text>
                <Text style={styles.debugText}>
                  📈 Total Value: {portfolioData?.totalValue?.toString() || 'N/A'}
                </Text>
                <Text style={styles.debugText}>
                  🎭 Rebalance Mode: {!!portfolioData || !!tempPortfolio ? 'REAL' : 'MOCK'}
                </Text>
              </View>
              
            </ScrollView>
          )
        ) : (
          <View style={styles.signInContainer}>
            <Text style={styles.subtitle}>
              Connect your wallet to start managing your Solana stablecoin portfolio
            </Text>
            <SignInFeature />
          </View>
        )}
      </View>
    );
  } catch (error) {
    console.error('HomeScreen error:', error);
    return (
      <View style={styles.screenContainer}>
        <Text style={{ color: 'red', textAlign: 'center' }}>
          HomeScreen Error: {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
    height: 60,
    overflow: "hidden",
  },
  logo: {
    width: 180,
    height: 180,
    marginTop: -60,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  initializeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  initializeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  initializeSubtitle: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 24,
  },
  initializeDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  initializeButton: {
    marginBottom: theme.spacing.md,
    minWidth: 200,
  },
  refreshButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  refreshButtonText: {
    color: theme.colors.surface,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  debugContainer: {
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  signInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  subtitle: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    fontSize: 16,
  },
});
