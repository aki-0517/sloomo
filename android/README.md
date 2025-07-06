# Android Configuration

This directory contains Android-specific configurations for the Solana Mobile CreditPay app.

## Prerequisites

1. **Android Studio** with SDK Platform 31+ (Android 12)
2. **Android SDK Tools** and build tools
3. **Android Virtual Device (AVD)** or physical Android device
4. **ANDROID_HOME** environment variable set

## Required Android Permissions

The app requires the following permissions (to be added to `android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

## Solana Mobile Stack Integration

For proper Solana Mobile Stack integration, ensure the following are configured:

1. **Target SDK Version**: 31 or higher
2. **Mobile Wallet Adapter**: Configured for Android WebSocket connections
3. **Seed Vault**: Hardware-backed key storage integration

## Build Commands

```bash
# Debug build
npm run android

# Release build
npm run build:android

# Clean build
npm run clean:android

# Debug APK
npm run build:android-debug
```

## Testing

Test the app on:
- Android Virtual Device (API 31+)
- Physical Android device with Solana Mobile Stack
- Saga phone (recommended for full feature testing)