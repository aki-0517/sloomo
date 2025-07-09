import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

import { useAuthorization } from "../utils/useAuthorization";
import { SignInFeature } from "../components/sign-in/sign-in-feature";
import { BalanceCard } from "../components/home/BalanceCard";
import { LineChart } from "../components/home/LineChart";
import { ActionButtons } from "../components/home/ActionButtons";
import { mockPortfolio, mockChartData } from "../utils/mock";
import { theme } from "../theme/colors";

console.log('HomeScreen module loading...');

export function HomeScreen() {
  console.log('HomeScreen component rendering...');
  
  try {
    const { selectedAccount } = useAuthorization();
    const navigation = useNavigation();
    
    console.log('selectedAccount:', selectedAccount);

    const handleEditPortfolio = () => {
      navigation.navigate('EditPortfolio' as never);
    };

    const handleDeposit = () => {
      // TODO: Navigate to DepositScreen
      console.log('Deposit pressed');
    };

    const handleRebalance = () => {
      // TODO: Navigate to RebalanceScreen
      console.log('Rebalance pressed');
    };

    return (
      <View style={styles.screenContainer}>
        <Text
          style={styles.title}
          variant="headlineMedium"
        >
          Sloomo
        </Text>
        {selectedAccount ? (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <BalanceCard 
              balance={mockPortfolio.totalValue} 
              growth={mockPortfolio.growth} 
            />
            <LineChart data={mockChartData} period="1M" />
            <ActionButtons 
              onEditPortfolio={handleEditPortfolio}
              onDeposit={handleDeposit}
              onRebalance={handleRebalance}
            />
          </ScrollView>
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
          HomeScreen Error: {error.toString()}
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
  title: {
    fontWeight: "bold",
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
    textAlign: "center",
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
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
