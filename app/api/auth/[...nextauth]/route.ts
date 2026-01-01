// Отключаем SSR для API route
export const dynamic = 'force-dynamic';

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session.user?.email) {
        session.user.id = token.sub as string;
      }
      // Сохраняем access token для использования в API routes
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
    async jwt({ token, account }) {
      // Сохраняем access token при первой авторизации
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };

