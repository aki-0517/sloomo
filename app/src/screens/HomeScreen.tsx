import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert, Image } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

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
    
    console.log('selectedAccount:', selectedAccount);

    // Check if portfolio exists when wallet is connected
    useEffect(() => {
      if (selectedAccount && contract) {
        checkPortfolio();
      }
    }, [selectedAccount, contract]);

    const checkPortfolio = async () => {
      if (!contract) return;
      
      setIsLoading(true);
      try {
        const data = await contract.getPortfolioData();
        setPortfolioData(data);
      } catch (error) {
        console.error('Error checking portfolio:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleInitializePortfolio = async () => {
      if (!contract) {
        Alert.alert('Error', 'Contract not initialized. Please connect your wallet.');
        return;
      }

      Alert.alert(
        'Initialize Portfolio',
        'This will create a new portfolio with SOL (60%) and USDC (40%) allocation. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Initialize', onPress: executeInitialization }
        ]
      );
    };

    const executeInitialization = async () => {
      if (!contract) return;

      try {
        const signature = await contract.initializePortfolio();
        Alert.alert(
          'Success',
          'Portfolio initialized successfully!',
          [
            {
              text: 'View Transaction',
              onPress: () => {
                console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
              }
            },
            {
              text: 'OK',
              onPress: () => {
                checkPortfolio(); // Reload portfolio data
              }
            }
          ]
        );
      } catch (error) {
        console.error('Portfolio initialization error:', error);
        Alert.alert('Error', `Portfolio initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                onRebalance={handleRebalance}
                onInitialize={handleInitializePortfolio}
                onRefresh={checkPortfolio}
                showInitialize={!portfolioData && !tempPortfolio}
              />
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
    marginBottom: theme.spacing.md,
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
