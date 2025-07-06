# Android エミュレーター詳細セットアップガイド

このガイドでは、Solana Mobile CreditPayアプリ開発用のAndroid エミュレーターの詳細なセットアップ手順を説明します。

## 🎯 エミュレーター要件

### 推奨スペック
- **API Level**: 31以降（Android 12+）
- **RAM**: 4GB以上（8GB推奨）
- **内部ストレージ**: 8GB以上
- **GPU**: ハードウェア加速有効
- **カメラ**: フロント・バック両方有効（QR機能用）

### 対応アーキテクチャ
- **Intel/AMD PC**: `x86_64`
- **Apple Silicon Mac**: `arm64-v8a`
- **Intel Mac**: `x86_64`

## 🛠️ 1. AVD Managerの起動

### Android Studioから起動
1. **Android Studio**を起動
2. **Welcome Screen**で**More Actions** → **AVD Manager**
3. または、プロジェクト開放中に**Tools** → **AVD Manager**

### コマンドラインから起動
```bash
# AVD Managerを直接起動
$ANDROID_HOME/tools/bin/avdmanager

# またはAndroid Studioのツールを使用
studio.sh &  # Linux
open -a "Android Studio"  # macOS
```

## 📱 2. エミュレーターデバイスの作成

### 2.1 Virtual Device Configuration

#### ステップ1: デバイス選択
1. **Create Virtual Device**をクリック
2. **Category**で**Phone**を選択
3. 推奨デバイス（スペック順）:

| デバイス | 画面 | RAM | 用途 |
|---------|------|-----|------|
| **Pixel 7** | 6.3" 1080x2400 | 8GB | 本番テスト用 |
| **Pixel 6** | 6.4" 1080x2340 | 8GB | 標準開発用 |
| **Pixel 5** | 6.0" 1080x2340 | 8GB | 軽量版 |
| **Nexus 5X** | 5.2" 1080x1920 | 2GB | 最小要件テスト |

4. **Next**をクリック

#### ステップ2: システムイメージ選択
1. **Recommended**タブを選択
2. **API Level 33** (Android 13)を推奨選択
3. **ABI**を確認:
   - **Apple Silicon Mac**: `arm64-v8a`
   - **Intel Mac/PC**: `x86_64`
4. 未ダウンロードの場合は**Download**をクリック
5. ダウンロード完了後**Next**

#### ステップ3: AVD詳細設定
1. **AVD Name**: `Solana_Mobile_Dev` （分かりやすい名前）
2. **Startup orientation**: `Portrait`
3. **Show Advanced Settings**をクリック

### 2.2 詳細設定（Advanced Settings）

#### メモリ設定
```
RAM: 4096 MB  # 4GB（最小）〜 8192 MB（推奨）
VM heap: 512 MB  # アプリヒープサイズ
```

#### ストレージ設定
```
Internal Storage: 8192 MB  # 8GB
SD card: 2048 MB  # 2GB（オプション）
```

#### GPU・グラフィックス設定
```
Graphics: Hardware - GLES 2.0  # ハードウェア加速
Multi-Core CPU: 4  # CPUコア数
```

#### カメラ設定（QRコード機能用）
```
Front Camera: Webcam0  # フロントカメラ
Back Camera: Webcam0   # バックカメラ
```

#### ネットワーク設定
```
Network Speed: Full    # フル帯域
Network Latency: None  # 遅延なし
```

#### その他設定
```
Boot option: Cold boot  # コールドブート
Keyboard: Hardware keyboard present  # ハードウェアキーボード
Skin: No Skin  # スキンなし（パフォーマンス向上）
```

### 2.3 エミュレーター作成完了
1. 設定確認後**Finish**をクリック
2. AVD Managerリストに新しいエミュレーターが表示されることを確認

## 🚀 3. エミュレーターの起動

### 3.1 AVD Managerから起動

1. **AVD Manager**でエミュレーターを選択
2. **▶️ (Actions)**列の**再生ボタン**をクリック
3. 起動オプション（必要に応じて）:
   - **Cold Boot Now**: 完全な新規起動
   - **Wipe Data**: データを消去して起動

### 3.2 コマンドラインから起動

```bash
# 利用可能なAVDの確認
emulator -list-avds

# エミュレーターを起動
emulator -avd Solana_Mobile_Dev

# 追加オプション付きで起動
emulator -avd Solana_Mobile_Dev -netdelay none -netspeed full -camera-back webcam0
```

### 3.3 起動時間の目安

| 段階 | 時間 | 説明 |
|------|------|------|
| 初回起動 | 3-5分 | システム初期化 |
| 2回目以降 | 1-2分 | 通常起動 |
| コールドブート | 2-3分 | 完全リセット起動 |

## ⚡ 4. パフォーマンス最適化

### 4.1 ハードウェア加速の確認

#### Intel/AMD PC用 HAXM
```bash
# HAXMが利用可能か確認
emulator -accel-check

# HAXMの状態確認
sc query intelhaxm  # Windows
kextstat | grep intel  # macOS
```

#### Apple Silicon Mac用 Hypervisor Framework
```bash
# Hypervisor Frameworkの確認
sysctl -n machdep.cpu.features | grep VMX
```

### 4.2 エミュレーター設定の最適化

#### config.iniの編集
```bash
# AVD設定ファイルの場所
# macOS: ~/.android/avd/[AVD_NAME].avd/config.ini
# Windows: C:\Users\[user]\.android\avd\[AVD_NAME].avd\config.ini

# 推奨設定
hw.gpu.enabled=yes
hw.gpu.mode=host
hw.ramSize=4096
disk.dataPartition.size=8192m
hw.keyboard=yes
hw.camera.back=webcam0
hw.camera.front=webcam0
```

### 4.3 ホストマシンのリソース設定

#### メモリ使用量の最適化
```bash
# Gradleヒープサイズ設定
echo "org.gradle.jvmargs=-Xmx4096m" >> android/gradle.properties

# Javaヒープサイズ設定
export _JAVA_OPTIONS="-Xmx4096m"
```

#### CPUリソースの割り当て
```bash
# エミュレーター起動時のCPUコア指定
emulator -avd Solana_Mobile_Dev -cores 4
```

## 📷 5. カメラとQR機能の設定

### 5.1 ウェブカメラの設定

#### macOS
```bash
# 利用可能なカメラデバイスの確認
system_profiler SPCameraDataType

# エミュレーター起動時にカメラ指定
emulator -avd Solana_Mobile_Dev -camera-back webcam0 -camera-front webcam0
```

#### Windows
```bash
# デバイスマネージャーでカメラデバイスを確認
# エミュレーター設定でカメラを有効化
```

### 5.2 QRコードテスト用の準備

#### テスト用QRコード
```bash
# オンラインQRコードジェネレーターを使用
# または、アプリ内QR生成機能をテスト

# テスト用Solana Pay QRコード例
{
  "type": "payment",
  "recipient": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 1.5,
  "currency": "USDC",
  "memo": "Test Payment"
}
```

## 🔧 6. トラブルシューティング

### 6.1 よくある問題と解決方法

#### 問題1: エミュレーターが起動しない
```bash
# 解決方法1: AVDを削除して再作成
# AVD Manager → 対象AVD → Delete

# 解決方法2: コールドブート
emulator -avd Solana_Mobile_Dev -no-snapshot-load

# 解決方法3: HAXMの再インストール
# SDK Manager → SDK Tools → Intel HAXM → Reinstall
```

#### 問題2: 動作が重い
```bash
# 解決方法1: RAMを増やす
# AVD Manager → Edit → Advanced → RAM: 8192 MB

# 解決方法2: GPUを無効化
emulator -avd Solana_Mobile_Dev -gpu off

# 解決方法3: 他のプロセスを終了
# Activity Monitor (macOS) / Task Manager (Windows)
```

#### 問題3: ネットワーク接続エラー
```bash
# 解決方法1: DNS設定の確認
emulator -avd Solana_Mobile_Dev -dns-server 8.8.8.8

# 解決方法2: プロキシ設定（企業環境）
emulator -avd Solana_Mobile_Dev -http-proxy [proxy_host:port]

# 解決方法3: ネットワークの再設定
adb shell settings put global airplane_mode_on 1
adb shell settings put global airplane_mode_on 0
```

#### 問題4: カメラが認識されない
```bash
# 解決方法1: カメラ設定の確認
# AVD Manager → Edit → Advanced Settings → Camera

# 解決方法2: 権限の確認
adb shell pm grant com.solana.creditpay android.permission.CAMERA

# 解決方法3: 仮想カメラの使用
# AVD設定でCamera → Emulated
```

### 6.2 ログとデバッグ

#### エミュレーターログの確認
```bash
# エミュレーターのログ出力
emulator -avd Solana_Mobile_Dev -verbose

# ADBログの確認
adb logcat | grep "Emulator"

# システムログの確認
adb shell dmesg
```

#### パフォーマンス監視
```bash
# CPU/メモリ使用量の監視
adb shell top

# GPU使用状況の確認
adb shell dumpsys gfxinfo com.solana.creditpay
```

## 📱 7. 複数エミュレーターの管理

### 7.1 複数AVDの作成

```bash
# 用途別のAVD作成例
# 1. 開発用（高スペック）
AVD Name: Solana_Dev_High
Device: Pixel 7
API: 33
RAM: 8192 MB

# 2. テスト用（標準）
AVD Name: Solana_Test_Standard  
Device: Pixel 6
API: 31
RAM: 4096 MB

# 3. 最小要件確認用
AVD Name: Solana_Test_Minimum
Device: Nexus 5X
API: 31
RAM: 2048 MB
```

### 7.2 並列実行

```bash
# 複数エミュレーターの同時起動
emulator -avd Solana_Dev_High -port 5554 &
emulator -avd Solana_Test_Standard -port 5556 &

# 起動確認
adb devices
```

## ⚙️ 8. React Nativeとの連携

### 8.1 開発用エミュレーターの起動確認

```bash
# React Native環境の確認
npx react-native doctor

# エミュレーター接続の確認
adb devices

# React Nativeアプリの起動
npm run android
```

### 8.2 ホットリロードとデバッグ

```bash
# 開発者メニューの表示
# エミュレーターでCtrl+M (Windows) / Cmd+M (macOS)

# またはコマンドから
adb shell input keyevent 82

# リロード
adb shell input text "r"
adb shell input text "r"
```

## ✅ 9. エミュレーター設定チェックリスト

### 基本設定
- [ ] API Level 31以降が選択されている
- [ ] RAM 4GB以上が割り当てられている
- [ ] ハードウェア加速が有効
- [ ] 内部ストレージ 8GB以上

### Solana Mobile CreditPay固有設定
- [ ] カメラ（フロント・バック）が有効
- [ ] ネットワーク接続が正常
- [ ] GPUハードウェア加速が有効
- [ ] キーボード入力が可能

### パフォーマンス確認
- [ ] 起動時間が3分以内
- [ ] アプリ起動が30秒以内
- [ ] UIの応答性が良好
- [ ] メモリ使用量が適切

### 機能確認
- [ ] QRコード読み取りが可能
- [ ] ネットワーク通信が正常
- [ ] ファイルアクセスが可能
- [ ] 通知機能が動作

## 🎯 次のステップ

エミュレーターの設定が完了したら：

1. **[installation-guide.md](./installation-guide.md)** - 基本環境構築の確認
2. **[setup-guide.md](./setup-guide.md)** - プロジェクト設定とアプリ起動
3. **[testing-guide.md](./testing-guide.md)** - 機能テストの実行

これで、Solana Mobile CreditPayアプリの開発とテストに最適化されたAndroidエミュレーター環境が整いました！🚀