import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Отключаем SSR по умолчанию
  output: undefined, // Не используем static export, так как нужен NextAuth
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || "1.0.0",
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  // Добавляем пустую конфигурацию Turbopack, чтобы убрать предупреждение
  // Webpack конфигурация все равно будет использоваться
  turbopack: {},
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
