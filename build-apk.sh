#!/bin/bash
# Build + sign release APK. Keystore lives OUTSIDE the repo (/home/box/secrets). Never commit it.
set -e;export JAVA_HOME=${JAVA_HOME:-/opt/jdk};export PATH=$JAVA_HOME/bin:$PATH;cd "$(dirname "$0")";export ANDROID_HOME=${ANDROID_HOME:-/home/box/android};BT=$ANDROID_HOME/build-tools/35.0.0
KS=${KS:-/home/box/secrets/purefxai-release.jks};export PW=$(grep storePassword ${KS_TXT:-/home/box/secrets/purefxai-keystore.txt}|cut -d= -f2)
source ./version.env
sed -i -E "s/versionCode [0-9]+/versionCode $VERSION_CODE/; s/versionName \"[^\"]*\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle
npx vite build && npx cap sync android
sed -i 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle android/capacitor-cordova-android-plugins/build.gradle node_modules/@capacitor/android/capacitor/build.gradle 2>/dev/null || true
(cd android && ./gradlew assembleRelease -q --no-daemon)
$BT/zipalign -f -p 4 android/app/build/outputs/apk/release/app-release-unsigned.apk /tmp/pg-al.apk
mkdir -p dist && $BT/apksigner sign --ks "$KS" --ks-key-alias purefxai --ks-pass env:PW --out dist/PUREGOLD.apk /tmp/pg-al.apk && rm -f dist/*.idsig
$BT/apksigner verify dist/PUREGOLD.apk
echo "Built PUREGOLD v$VERSION_NAME ($VERSION_CODE) sha256=$(sha256sum dist/PUREGOLD.apk|cut -d' ' -f1)"
