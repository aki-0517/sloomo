// Minimal test version to identify issues
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  console.log('Minimal App rendering...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Minimal App Working!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
});