// Polyfills
import "./src/polyfills";

import { StyleSheet, useColorScheme, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { Component } from "react";

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from "@react-navigation/native";
import {
  PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from "react-native-paper";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { PortfolioProvider } from "./src/context/PortfolioContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.toString()}
          </Text>
          <Text 
            style={{ color: 'blue', textDecorationLine: 'underline' }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  console.log('App component rendering...');
  
  try {
    const colorScheme = useColorScheme();
    console.log('Color scheme:', colorScheme);
    
    const { LightTheme, DarkTheme } = adaptNavigationTheme({
      reactNavigationLight: NavigationDefaultTheme,
      reactNavigationDark: NavigationDarkTheme,
    });

    const CombinedDefaultTheme = {
      ...MD3LightTheme,
      ...LightTheme,
      colors: {
        ...MD3LightTheme.colors,
        ...LightTheme.colors,
      },
    };
    const CombinedDarkTheme = {
      ...MD3DarkTheme,
      ...DarkTheme,
      colors: {
        ...MD3DarkTheme.colors,
        ...DarkTheme.colors,
      },
    };
    
    console.log('About to render App JSX...');
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ClusterProvider>
            <ConnectionProvider config={{ commitment: "processed" }}>
              <PortfolioProvider>
                <SafeAreaView
                  style={[
                    styles.shell,
                    {
                      backgroundColor:
                        colorScheme === "dark"
                          ? MD3DarkTheme.colors.background
                          : MD3LightTheme.colors.background,
                    },
                  ]}
                >
                  <PaperProvider
                    theme={
                      colorScheme === "dark"
                        ? CombinedDarkTheme
                        : CombinedDefaultTheme
                    }
                  >
                    <AppNavigator />
                  </PaperProvider>
                </SafeAreaView>
              </PortfolioProvider>
            </ConnectionProvider>
          </ClusterProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error in App component:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>
          App Error: {error.toString()}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
