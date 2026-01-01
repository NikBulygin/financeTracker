# Finance App - Android TWA

Это Android приложение, созданное как Trusted Web Activity (TWA) для Finance App.

## Настройка

1. Замените `YOUR_DOMAIN.com` в следующих файлах на ваш реальный домен:
   - `app/src/main/AndroidManifest.xml`
   - `app/src/main/java/com/financeapp/twa/MainActivity.kt`

2. Настройте Digital Asset Links:
   - Создайте файл `.well-known/assetlinks.json` на вашем сервере
   - Укажите SHA-256 fingerprint вашего приложения

3. Соберите APK:
   ```bash
   ./gradlew assembleRelease
   ```

## Требования

- Android Studio Arctic Fox или новее
- JDK 8 или выше
- Android SDK 23+ (для поддержки TWA)

## Digital Asset Links

Для работы TWA необходимо настроить Digital Asset Links. Создайте файл на вашем сервере:
`https://YOUR_DOMAIN.com/.well-known/assetlinks.json`

Пример содержимого:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.financeapp.twa",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

Для получения SHA-256 fingerprint:
```bash
keytool -list -v -keystore app/release.keystore -alias release
```

