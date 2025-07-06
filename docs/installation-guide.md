# Solana Mobile CreditPay 完全インストールガイド

このガイドでは、ゼロからSolana Mobile CreditPayアプリの開発環境を構築し、エミュレーターでアプリを起動するまでの全手順を説明します。

## 📋 事前準備

### システム要件
- **OS**: macOS 10.15以降 / Windows 10以降 / Ubuntu 18.04以降
- **RAM**: 8GB以上推奨（16GB理想）
- **ストレージ**: 20GB以上の空き容量
- **インターネット接続**: 安定したブロードバンド接続

### 必要アカウント
- **GitHub**: ソースコード管理用
- **Supabase**: データベース用（無料アカウント）
- **Google**: Android開発者登録用（オプション）

## 🛠️ 1. 基本開発ツールのインストール

### 1.1 Node.jsのインストール

#### macOSの場合
```bash
# Homebrewをインストール（未インストールの場合）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.jsをインストール
brew install node@18

# バージョン確認
node --version  # v18.x.x が表示されることを確認
npm --version   # v9.x.x 以降が表示されることを確認
```

#### Windowsの場合
1. [Node.js公式サイト](https://nodejs.org/)から「LTS版」をダウンロード
2. ダウンローダーを実行してインストール
3. コマンドプロンプトで確認:
```cmd
node --version
npm --version
```

#### Linuxの場合
```bash
# NodeSourceリポジトリを追加
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.jsをインストール
sudo apt-get install -y nodejs

# バージョン確認
node --version
npm --version
```

### 1.2 Gitのインストール

#### macOS
```bash
# Homebrewでインストール
brew install git

# または、Xcodeコマンドラインツールでインストール
xcode-select --install
```

#### Windows
1. [Git公式サイト](https://git-scm.com/download/win)からインストーラーをダウンロード
2. インストーラーを実行（デフォルト設定で問題なし）

#### Linux
```bash
sudo apt update
sudo apt install git
```

### 1.3 React Native CLIのインストール

```bash
# React Native CLIをグローバルインストール
npm install -g react-native-cli

# React Native Community CLIもインストール
npm install -g @react-native-community/cli

# インストール確認
npx react-native --version
```

## 📱 2. Android開発環境のセットアップ

### 2.1 Java Development Kit (JDK) のインストール

#### macOS
```bash
# OpenJDK 11をインストール
brew install openjdk@11

# JDKパスを設定
echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@11"' >> ~/.zshrc

# 設定を反映
source ~/.zshrc

# 確認
java -version
```

#### Windows
1. [Oracle JDK 11](https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html)をダウンロード
2. インストーラーを実行
3. 環境変数を設定:
   - `JAVA_HOME`: `C:\Program Files\Java\jdk-11.x.x`
   - `PATH`に`%JAVA_HOME%\bin`を追加

#### Linux
```bash
sudo apt update
sudo apt install openjdk-11-jdk

# JAVA_HOME設定
echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc

java -version
```

### 2.2 Android Studioのインストール

#### 全プラットフォーム共通
1. [Android Studio公式サイト](https://developer.android.com/studio)にアクセス
2. **Download Android Studio**をクリック
3. 利用規約に同意してダウンロード
4. インストーラーを実行

#### インストール後の初期設定
1. **Android Studio**を起動
2. **Do not import settings**を選択
3. **Next**をクリックして初期設定ウィザードを開始
4. **Standard**インストールを選択
5. **UI Theme**を選択（Dark推奨）
6. **Verify Settings**画面で**Next**
7. **License Agreement**を確認して**Accept**
8. **Finish**をクリックしてダウンロード開始（数GB、時間がかかります）

### 2.3 Android SDKの設定

#### SDK Manager の設定
1. Android Studio起動後、**More Actions** → **SDK Manager**をクリック
2. **SDK Platforms**タブで以下をチェック:
   - ✅ **Android 13 (API level 33)** - 最新版
   - ✅ **Android 12 (API level 31)** - Solana Mobile Stack対応
   - ✅ **Android 11 (API level 30)** - 互換性確保
3. **SDK Tools**タブで以下をチェック:
   - ✅ **Android SDK Build-Tools 33.0.0**
   - ✅ **Android Emulator**
   - ✅ **Android SDK Platform-Tools**
   - ✅ **Intel x86 Emulator Accelerator (HAXM installer)**
4. **Apply**をクリックしてダウンロード

#### SDK パスの確認
1. **SDK Manager**で**Android SDK Location**をコピー
2. 通常は以下の場所:
   - **macOS**: `/Users/[username]/Library/Android/sdk`
   - **Windows**: `C:\Users\[username]\AppData\Local\Android\Sdk`
   - **Linux**: `/home/[username]/Android/Sdk`

### 2.4 環境変数の設定

#### macOS (.zshrc または .bash_profile)
```bash
# Android SDK環境変数
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# 設定を反映
source ~/.zshrc

# 確認
echo $ANDROID_HOME
adb version
```

#### Windows (システム環境変数)
1. **スタートメニュー** → **システム** → **詳細情報** → **システムの詳細設定**
2. **環境変数**をクリック
3. **システム環境変数**で**新規**をクリック:
   - 変数名: `ANDROID_HOME`
   - 変数値: `C:\Users\[username]\AppData\Local\Android\Sdk`
4. **Path**変数を編集して以下を追加:
   - `%ANDROID_HOME%\emulator`
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools\bin`
5. **OK**をクリックして保存
6. コマンドプロンプトを再起動して確認:
```cmd
echo %ANDROID_HOME%
adb version
```

#### Linux (.bashrc)
```bash
# ~/.bashrcに追加
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# 設定を反映
source ~/.bashrc

# 確認
echo $ANDROID_HOME
adb version
```

## 📱 3. Android仮想デバイス（AVD）の作成

### 3.1 AVD Managerの起動

1. **Android Studio**を起動
2. **More Actions** → **AVD Manager**をクリック
3. **Create Virtual Device**をクリック

### 3.2 デバイスの選択

1. **Category**で**Phone**を選択
2. 推奨デバイス（以下から選択）:
   - **Pixel 7** - 最新の推奨デバイス
   - **Pixel 6** - 中程度のスペック
   - **Pixel 4** - 軽量版
3. **Next**をクリック

### 3.3 システムイメージの選択

1. **Recommended**タブで以下を選択:
   - **API Level 33** (Android 13) - 最新版
   - **ABI**: `x86_64` - Intel Mac/PC用
   - **ABI**: `arm64-v8a` - Apple Silicon Mac用
2. まだダウンロードされていない場合は**Download**をクリック
3. ダウンロード完了後、**Next**をクリック

### 3.4 AVD設定の詳細設定

1. **AVD Name**: `Solana_Mobile_Test` などの分かりやすい名前
2. **Advanced Settings**をクリックして詳細設定:
   - **RAM**: `4096` MB（4GB）以上
   - **VM heap**: `512` MB
   - **Internal Storage**: `8192` MB（8GB）
   - **SD card**: `2048` MB（2GB）
   - **Graphics**: `Hardware - GLES 2.0`
3. **Show Advanced Settings**で追加設定:
   - **Camera - Front**: `Webcam0`
   - **Camera - Back**: `Webcam0`
   - **Network - Speed**: `Full`
   - **Network - Latency**: `None`
4. **Finish**をクリック

### 3.5 エミュレーターの起動確認

1. AVD Managerで作成したAVDの**▶️ (Play)**ボタンをクリック
2. エミュレーターが起動することを確認（初回は5-10分かかる場合があります）
3. Android OSが正常に読み込まれることを確認

## 🔧 4. 開発環境の確認とトラブルシューティング

### 4.1 React Native環境の確認

```bash
# React Native環境のヘルスチェック
npx react-native doctor
```

#### 期待される出力例
```
✓ Node.js
✓ npm
✓ Yarn
✓ Watchman
✓ Android SDK
✓ Android Studio
✓ Android Emulator
```

### 4.2 よくある問題と解決方法

#### 問題1: `ANDROID_HOME` が認識されない
```bash
# 現在の設定確認
echo $ANDROID_HOME

# 設定されていない場合は再設定
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS例
source ~/.zshrc
```

#### 問題2: エミュレーターが起動しない
```bash
# 利用可能なAVDの確認
emulator -list-avds

# エミュレーターを直接起動
emulator -avd Solana_Mobile_Test

# HAXM加速の確認（Intel Mac/PC）
emulator -accel-check
```

#### 問題3: ADBが認識されない
```bash
# platform-toolsパスの確認
which adb

# ADBサーバーの再起動
adb kill-server
adb start-server

# 接続デバイスの確認
adb devices
```

#### 問題4: メモリ不足エラー
```bash
# Javaヒープサイズを増やす
export _JAVA_OPTIONS="-Xmx4096m"

# または、gradle.propertiesで設定
echo "org.gradle.jvmargs=-Xmx4096m" >> android/gradle.properties
```

## 🚀 5. プロジェクトのセットアップとアプリ起動

### 5.1 プロジェクトのクローン

```bash
# プロジェクトディレクトリに移動
cd ~/Desktop  # 任意の場所

# リポジトリのクローン（または既存プロジェクトのパス）
git clone https://github.com/your-username/metamask-hack.git
cd metamask-hack

# または、既存のプロジェクトディレクトリに移動
cd /Users/user/Desktop/metamask-hack
```

### 5.2 依存関係のインストール

```bash
# Node.js依存関係のインストール
npm install

# React Native 0.60以降では自動リンクのため、手動リンクは不要
# キャッシュクリア（問題が発生した場合）
npx react-native start --reset-cache
```

### 5.3 Android固有の設定

```bash
# Androidプロジェクトのクリーンビルド
cd android
./gradlew clean
cd ..

# Gradleラッパーの実行権限付与（macOS/Linux）
chmod +x android/gradlew
```

### 5.4 Metro bundlerの起動

```bash
# 新しいターミナルタブで Metro bundler を起動
npm start

# または、キャッシュクリアして起動
npm start -- --reset-cache
```

### 5.5 Androidアプリの起動

```bash
# 別のターミナルタブで Android アプリを起動
npm run android

# または、直接React Native CLIを使用
npx react-native run-android
```

### 5.6 起動確認

1. **エミュレーターが自動起動**することを確認
2. **Metro bundler**がコード変更を監視していることを確認
3. **アプリが正常に起動**することを確認
4. **ホーム画面**が表示されることを確認

## 🐛 6. トラブルシューティング集

### 6.1 一般的なエラーと解決方法

#### エラー: `EACCES: permission denied`
```bash
# npmのグローバルディレクトリを変更
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
source ~/.bashrc  # または ~/.zshrc
```

#### エラー: `Unable to load script from assets`
```bash
# Metro bundlerが起動していることを確認
npm start

# アプリを再ビルド
npm run android
```

#### エラー: `Failed to launch emulator`
```bash
# AVDを削除して再作成
# AVD Manager → 対象AVDを削除 → 新規作成

# または、コマンドラインから起動
emulator -avd Solana_Mobile_Test -verbose
```

#### エラー: `Android SDK not found`
```bash
# ANDROID_HOME再設定
export ANDROID_HOME=$HOME/Library/Android/sdk
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
source ~/.zshrc

# React Native環境チェック
npx react-native doctor
```

### 6.2 パフォーマンス最適化

#### エミュレーター高速化
```bash
# HAXM（Hardware Accelerated Execution Manager）の確認
emulator -accel-check

# 利用可能な場合、HAXMを有効化
# Android Studio → SDK Manager → SDK Tools → Intel HAXM
```

#### メモリ使用量の最適化
```bash
# Gradle設定最適化
echo "org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8" >> android/gradle.properties
echo "org.gradle.parallel=true" >> android/gradle.properties
echo "org.gradle.configureondemand=true" >> android/gradle.properties
```

## ✅ 7. 環境構築完了チェックリスト

### 基本ツール
- [ ] Node.js 18以降がインストール済み
- [ ] npm/yarn がインストール済み
- [ ] Git がインストール済み
- [ ] React Native CLI がインストール済み

### Android開発環境
- [ ] Java JDK 11 がインストール済み
- [ ] Android Studio がインストール済み
- [ ] Android SDK がインストール済み
- [ ] ANDROID_HOME 環境変数が設定済み
- [ ] adb コマンドが利用可能

### 仮想デバイス
- [ ] AVD が作成済み
- [ ] エミュレーターが正常に起動する
- [ ] Android 12+ (API 31+) が動作する

### プロジェクト
- [ ] プロジェクトのクローン/ダウンロード完了
- [ ] npm install 完了
- [ ] Metro bundler が起動する
- [ ] Android アプリが起動する

### 動作確認
- [ ] アプリが正常に表示される
- [ ] ホットリロードが動作する
- [ ] コンソールにエラーが表示されない

## 🎯 次のステップ

環境構築が完了したら、以下のドキュメントに進んでください：

1. **[setup-guide.md](./setup-guide.md)** - Supabase設定とプロジェクト設定
2. **[testing-guide.md](./testing-guide.md)** - 機能テストと動作確認
3. **[tech-stack.md](./tech-stack.md)** - 技術仕様と開発ガイドライン

## 🆘 サポート

問題が発生した場合は、以下のコマンドで詳細情報を収集してください：

```bash
# 環境情報の収集
npx react-native info

# React Native環境チェック
npx react-native doctor

# Android デバイス接続確認
adb devices

# エミュレーター詳細確認
emulator -list-avds
```

これらの情報と共に、具体的なエラーメッセージを開発チームと共有してください。

おめでとうございます！これでSolana Mobile CreditPayアプリの開発環境が完全にセットアップされました。🎉