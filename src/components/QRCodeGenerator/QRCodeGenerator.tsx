import React, { useState } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { Card, Text, Button, TextInput } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { QRCodeData } from '../../types/payment';

interface QRCodeGeneratorProps {
  walletAddress: string;
  onQRGenerated?: (qrData: QRCodeData) => void;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  walletAddress,
  onQRGenerated,
}) => {
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [qrData, setQRData] = useState<QRCodeData | null>(null);

  const generateQR = () => {
    const qrCodeData: QRCodeData = {
      type: 'payment',
      recipient: walletAddress,
      amount: amount ? parseFloat(amount) : undefined,
      currency: 'USDC',
      memo: memo || undefined,
      reference: `payment-${Date.now()}`,
    };

    setQRData(qrCodeData);
    onQRGenerated?.(qrCodeData);
  };

  const shareQR = async () => {
    if (!qrData) return;

    try {
      const message = `Pay me with Solana Mobile CreditPay\nAmount: ${qrData.amount ? `$${qrData.amount}` : 'Any amount'}\nWallet: ${qrData.recipient}`;
      await Share.share({
        message,
        title: 'Payment Request',
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Generate Payment QR Code
        </Text>

        <TextInput
          label="Amount (USD)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Optional - leave empty for any amount"
        />

        <TextInput
          label="Memo"
          value={memo}
          onChangeText={setMemo}
          style={styles.input}
          placeholder="Optional payment description"
        />

        <Button
          mode="contained"
          onPress={generateQR}
          style={styles.generateButton}
          icon="qrcode"
        >
          Generate QR Code
        </Button>

        {qrData && (
          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify(qrData)}
              size={200}
              backgroundColor="white"
              color="black"
            />
            
            <View style={styles.qrInfo}>
              <Text variant="bodyMedium">
                Amount: {qrData.amount ? `$${qrData.amount}` : 'Any amount'}
              </Text>
              <Text variant="bodySmall" style={styles.walletAddress}>
                Wallet: {qrData.recipient.substring(0, 8)}...{qrData.recipient.substring(qrData.recipient.length - 8)}
              </Text>
              {qrData.memo && (
                <Text variant="bodySmall">
                  Memo: {qrData.memo}
                </Text>
              )}
            </View>

            <Button
              mode="outlined"
              onPress={shareQR}
              style={styles.shareButton}
              icon="share"
            >
              Share QR Code
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  generateButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  qrInfo: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  walletAddress: {
    color: '#666',
    fontFamily: 'monospace',
  },
  shareButton: {
    marginTop: 16,
  },
});