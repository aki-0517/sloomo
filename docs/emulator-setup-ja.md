# Solana Mobile CreditPay 開発環境セットアップ

このガイドでは、MacでAndroidエミュレーターを使用してSolana Mobile CreditPayアプリを開発・テストするための完全な手順を説明します。

## 前提条件

- macOS環境
- Android Studio と Android SDK がインストール済み
- Java 17 (OpenJDK)
- Node.js と npm/yarn

## 開発環境確認

### 1. Java バージョンの確認と設定

```bash
# 現在のJavaバージョンを確認
java -version

# Java 17がインストールされていない場合
brew install openjdk@17

# 環境変数を設定
export JAVA_HOME=/usr/local/opt/openjdk@17
export PATH="/usr/local/opt/openjdk@17/bin:$PATH"
```

### 2. Android SDK 環境変数の設定

```bash
# Android SDKの場所を確認
ls ~/Library/Android/sdk

# 環境変数を設定
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH
```

## Androidエミュレーター起動

### 1. 利用可能なAVD確認

```bash
cd ~/Library/Android/sdk/emulator
./emulator -list-avds
```

### 2. エミュレーター起動

```bash
# 例：Pixel_Fold_API_35 AVDを起動
cd ~/Library/Android/sdk/emulator
./emulator -avd Pixel_Fold_API_35 &
```

### 3. ADB接続確認

```bash
# デバイス接続確認
adb devices
```

## アプリのビルドとインストール

### 1. カスタム開発ビルド

Solana Mobile SDKsは、カスタム開発ビルドが必要です。従来のExpo Goでは動作しません。

### 2. ローカルビルドの実行

必要な環境変数を設定してビルド：

```bash
# Java 17とAndroid SDKの環境変数を設定
export JAVA_HOME=/usr/local/opt/openjdk@17
export PATH="/usr/local/opt/openjdk@17/bin:$PATH"
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH

# ローカルビルド実行
npx eas build --profile development --platform android --local
```

### 3. APKのインストール

ビルド完了後、生成されたAPKをエミュレーターにインストール：

```bash
# APKファイルの場所を確認
find /var/folders -name "*.apk" -type f 2>/dev/null | head -5

# エミュレーターにインストール
adb install [APKファイルのパス]
```

### 4. アプリ起動確認

```bash
# インストール確認
adb shell pm list packages | grep solana

# アプリ起動
adb shell am start -n com.solana.mobile.expo.template/.MainActivity
```

## 開発サーバーの起動

### 完全な開発手順

以下の手順で、エミュレーターでの開発を開始してください：

```bash
# 1. Androidエミュレーターが起動していることを確認
adb devices

# 2. カスタム開発ビルドを作成（初回のみ）
npx eas build --profile development --platform android --local

# 3. APKをエミュレーターにインストール（初回のみ）
find /var/folders -name "*.apk" -type f 2>/dev/null | head -5
adb install [APKファイルのパス]

# 4. 開発サーバーを起動
npx expo start --dev-client
```

### Metro Bundler起動

```bash
# 開発サーバー起動
npx expo start --dev-client

# 別ポートで起動する場合
PORT=8082 npx expo start --dev-client --port 8082
```

### 開発サーバー起動後の確認事項

開発サーバーが正常に起動すると、以下のような出力が表示されます：

```
Starting project at /Users/user/Desktop/credit-pay/credit-pay
Starting Metro Bundler
› Opening exp+credit-pay://expo-development-client/?url=http%3A%2F%2F100.84.9.63%3A8081 on [Device Name]
Waiting on http://localhost:8081
Android Bundled 7021ms node_modules/expo/AppEntry.js (1356 modules)
```

この状態で、エミュレーター上のアプリに変更が自動的に反映されます。

### 開発中の便利なコマンド

- **リロード**: ターミナルで `r` を押す
- **DevTools**: ターミナルで `j` を押す（Chrome/Edge必要）
- **サーバー停止**: `Ctrl+C`

## Solanaウォレットのセットアップ

### ウォレット接続エラーの解決

初回起動時に「Found no installed wallet that supports the mobile wallet protocol」エラーが表示される場合、以下の手順でウォレットアプリをインストールしてください。

### 1. Google Play Store経由でのインストール（推奨）

エミュレーターで以下の手順を実行：

1. **Google Play Store**アプリを開く
2. 検索バーで「**Phantom**」と検索
3. **Phantom - Crypto Wallet**を選択
4. **インストール**をタップ

または、以下のコマンドでPhantom Walletページを直接開く：

```bash
adb shell am start -n com.android.vending/.AssetBrowserActivity -a android.intent.action.VIEW -d "market://details?id=app.phantom"
```

### 2. 代替ウォレットオプション

- **Solflare Wallet**: 検索で「Solflare」
- **Ultimate Wallet**: 検索で「Ultimate」

### 3. ウォレット初期設定

ウォレットアプリインストール後：

1. ウォレットアプリを開く
2. **新しいウォレットを作成**を選択
3. シードフレーズを安全に保存（テスト用）
4. PINまたはパスワードを設定

## ウォレット接続テスト

### 1. CreditPayアプリでの接続

1. CreditPayアプリを開く
2. **Connect**ボタンをタップ
3. インストールしたウォレットアプリが自動的に開く
4. 接続を**承認**
5. CreditPayアプリに戻る
6. 接続成功を確認

### 2. エラーハンドリング

アプリには改善されたエラーハンドリングが実装されており、ウォレットが見つからない場合は分かりやすいガイダンスが表示されます。

## トラブルシューティング

### よくある問題と解決方法

1. **Java 11エラー**: Java 17に更新してください
2. **SDK location not found**: ANDROID_HOME環境変数を確認
3. **Metro Bundler起動に時間がかかる**: 別ポートを試すか、時間をおいて再実行
4. **ウォレット接続エラー**: 上記のウォレットインストール手順を実行

### 開発のベストプラクティス

- テスト用の新しいウォレットを使用
- 本番用の資産は使用しない
- エミュレーターでの動作確認後、実機でもテスト

これで、Solana Mobile CreditPayアプリの完全な開発環境が整いました！
