import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useContract } from '../hooks/useContract';
import { theme } from '../theme/colors';

export function DepositScreen() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const contract = useContract();

  const handleDeposit = async () => {
    if (!contract) {
      Alert.alert('Error', 'Contract not initialized. Please connect your wallet.');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const signature = await contract.depositSol(depositAmount);

      Alert.alert(
        'Success',
        'SOL deposit successful!',
        [
          {
            text: 'View Transaction',
            onPress: () => {
              // You could open the transaction in a browser or show it in the app
              console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
            }
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Deposit error:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide helpful hints based on error type
        if (errorMessage.includes('Insufficient SOL')) {
          errorMessage += '\n\n💡 Hint: Try getting more devnet SOL from https://faucet.solana.com/';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage += '\n\n💡 Hint: Check your wallet balance and ensure you have enough SOL for transaction fees.';
        } else if (errorMessage.includes('blockhash')) {
          errorMessage += '\n\n💡 Hint: Network issue. Please try again.';
        }
      }
      
      Alert.alert('Deposit Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxBalance = async () => {
    if (!contract) return;
    
    try {
      const balances = await contract.getUserBalances();
      const maxAmount = Math.max(0, balances.sol - 0.05); // Reserve 0.05 SOL for account creation and fees
      setAmount(maxAmount.toString());
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Deposit SOL
          </Text>
          
          <Text style={styles.label}>Amount</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              mode="outlined"
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter SOL amount"
              keyboardType="numeric"
              right={
                <TextInput.Affix 
                  text="SOL" 
                  textStyle={styles.suffix}
                />
              }
            />
            <Button 
              mode="outlined" 
              onPress={getMaxBalance}
              style={styles.maxButton}
            >
              Max
            </Button>
          </View>

          <Text style={styles.infoText}>
            Deposit SOL to your portfolio. 0.05 SOL will be reserved for account creation and transaction fees.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleDeposit}
              disabled={!amount || isLoading}
              loading={isLoading}
              style={styles.depositButton}
            >
              Deposit SOL
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  card: {
    marginTop: theme.spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    color: theme.colors.primary,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  input: {
    flex: 1,
  },
  suffix: {
    color: theme.colors.textSecondary,
  },
  maxButton: {
    minWidth: 60,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
  depositButton: {
    marginBottom: theme.spacing.sm,
  },
});