import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useContract } from '../hooks/useContract';
import { theme } from '../theme/colors';

export function DepositScreen() {
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'USDC' | 'SOL'>('USDC');
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
      let signature: string;
      
      if (tokenType === 'USDC') {
        signature = await contract.depositUsdc(depositAmount);
      } else {
        signature = await contract.depositSol(depositAmount);
      }

      Alert.alert(
        'Success',
        `${tokenType} deposit successful!`,
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
      Alert.alert('Error', `Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxBalance = async () => {
    if (!contract) return;
    
    try {
      const balances = await contract.getUserBalances();
      const maxAmount = tokenType === 'SOL' 
        ? Math.max(0, balances.sol - 0.01) // Reserve 0.01 SOL for fees
        : balances.usdc;
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
            Deposit Funds
          </Text>
          
          <Text style={styles.label}>Select Token</Text>
          <RadioButton.Group 
            onValueChange={(value) => setTokenType(value as 'USDC' | 'SOL')} 
            value={tokenType}
          >
            <View style={styles.radioContainer}>
              <View style={styles.radioItem}>
                <RadioButton value="USDC" />
                <Text>USDC</Text>
              </View>
              <View style={styles.radioItem}>
                <RadioButton value="SOL" />
                <Text>SOL</Text>
              </View>
            </View>
          </RadioButton.Group>

          <Text style={styles.label}>Amount</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              mode="outlined"
              value={amount}
              onChangeText={setAmount}
              placeholder={`Enter ${tokenType} amount`}
              keyboardType="numeric"
              right={
                <TextInput.Affix 
                  text={tokenType} 
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
            {tokenType === 'USDC' 
              ? 'Deposit USDC to your portfolio. Make sure you have USDC in your wallet.'
              : 'Deposit SOL to your portfolio. A small amount will be reserved for transaction fees.'
            }
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleDeposit}
              disabled={!amount || isLoading}
              loading={isLoading}
              style={styles.depositButton}
            >
              Deposit {tokenType}
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
  radioContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
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