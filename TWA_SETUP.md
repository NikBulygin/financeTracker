# Инструкция по настройке TWA для Finance App

## Проблема с аутентификацией

NextAuth требует серверный API route (`/api/auth/[...nextauth]`), который не будет работать в standalone TWA без внешнего сервера.

## Решения

### Вариант 1: Внешний сервер (Рекомендуется)

1. Задеплойте Next.js приложение на сервер (Vercel, Netlify, или собственный сервер)
2. Обновите `android/app/src/main/AndroidManifest.xml` и `MainActivity.kt` с URL вашего сервера
3. Настройте Digital Asset Links на сервере

### Вариант 2: Альтернативная аутентификация для мобильного

Используйте Firebase Auth или другой метод, который работает полностью на клиенте.

### Вариант 3: Deep Linking для аутентификации

Настройте deep linking, чтобы аутентификация происходила через системный браузер, а затем возвращалась в приложение.

## Шаги для сборки APK

1. **Задеплойте приложение на сервер:**
   ```bash
   npm run build
   # Задеплойте на Vercel, Netlify или другой хостинг
   ```

2. **Обновите Android проект:**
   - Замените `YOUR_DOMAIN.com` на ваш реальный домен
   - В `AndroidManifest.xml`
   - В `MainActivity.kt`

3. **Настройте Digital Asset Links:**
   - Создайте файл `.well-known/assetlinks.json` на вашем сервере
   - Получите SHA-256 fingerprint вашего keystore
   - Добавьте fingerprint в `assetlinks.json`

4. **Создайте keystore для релиза:**
   ```bash
   cd android
   keytool -genkey -v -keystore app/release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
   ```

5. **Соберите APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

6. **APK будет в:**
   `android/app/build/outputs/apk/release/app-release.apk`

## Проверка перед сборкой

- ✅ Все клиентские функции используют только браузерные API
- ✅ Нет использования Node.js модулей (fs, path, crypto) на клиенте
- ✅ Все `process.env` используют `NEXT_PUBLIC_*` префикс
- ✅ PWA манифест настроен правильно
- ⚠️ NextAuth API требует внешний сервер


