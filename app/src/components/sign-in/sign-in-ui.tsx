import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { useState, useCallback } from "react";
import { Button, Text } from "react-native-paper";
import { View, StyleSheet, Alert } from "react-native";
import { alertAndLog } from "../../utils/alertAndLog";
import { useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";

export function ConnectButton() {
  const { authorizeSession } = useAuthorization();
  const { connect } = useMobileWallet();
  const [authorizationInProgress, setAuthorizationInProgress] = useState(false);
  
  const showWalletInstallationGuide = () => {
    Alert.alert(
      "No Wallet Found",
      "No Solana-compatible wallet found. For development:\n\n1. Install a Solana wallet app (Phantom, Solflare)\n2. Download fakewallet for testing:\nhttps://github.com/solana-mobile/mobile-wallet-adapter/releases\n3. Or use the browser version on your computer",
      [
        { text: "OK", style: "default" }
      ]
    );
  };

  const handleConnectPress = useCallback(async () => {
    try {
      if (authorizationInProgress) {
        return;
      }
      setAuthorizationInProgress(true);
      await connect();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : err;
      
      // Check if it's a wallet not found error
      if (errorMessage && errorMessage.includes("no installed wallet")) {
        showWalletInstallationGuide();
      } else {
        alertAndLog("Error during connect", errorMessage);
      }
    } finally {
      setAuthorizationInProgress(false);
    }
  }, [authorizationInProgress, authorizeSession]);
  
  return (
    <View style={{ flex: 1 }}>
      <Button
        mode="contained"
        disabled={authorizationInProgress}
        onPress={handleConnectPress}
        style={{ flex: 1 }}
      >
        Connect
      </Button>
    </View>
  );
}

export function SignInButton() {
  const { authorizeSession } = useAuthorization();
  const { signIn } = useMobileWallet();
  const [signInInProgress, setSignInInProgress] = useState(false);
  
  const showWalletInstallationGuide = () => {
    Alert.alert(
      "No Wallet Found",
      "No Solana-compatible wallet found. For development:\n\n1. Install a Solana wallet app (Phantom, Solflare)\n2. Download fakewallet for testing:\nhttps://github.com/solana-mobile/mobile-wallet-adapter/releases\n3. Or use the browser version on your computer",
      [
        { text: "OK", style: "default" }
      ]
    );
  };

  const handleConnectPress = useCallback(async () => {
    try {
      if (signInInProgress) {
        return;
      }
      setSignInInProgress(true);
      await signIn({
        domain: "creditpay.app",
        statement: "Sign into Solana Mobile CreditPay",
        uri: "https://creditpay.app",
      });
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : err;
      
      // Check if it's a wallet not found error
      if (errorMessage && errorMessage.includes("no installed wallet")) {
        showWalletInstallationGuide();
      } else {
        alertAndLog("Error during sign in", errorMessage);
      }
    } finally {
      setSignInInProgress(false);
    }
  }, [signInInProgress, authorizeSession]);
  
  return (
    <Button
      mode="outlined"
      disabled={signInInProgress}
      onPress={handleConnectPress}
      style={{ marginLeft: 4, flex: 1 }}
    >
      Sign in
    </Button>
  );
}
