import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { signInSchema } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

export const authConfiguration = {
  isConfigured: Boolean(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET),
  googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  missing: [
    !process.env.NEXTAUTH_URL && "NEXTAUTH_URL",
    !process.env.NEXTAUTH_SECRET && "NEXTAUTH_SECRET",
  ].filter(Boolean) as string[],
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const result = signInSchema.safeParse(credentials);
        if (!result.success) return null;
        const user = await prisma.user.findUnique({ where: { email: result.data.email } });
        if (!user?.passwordHash || !(await compare(result.data.password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })] : []),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      if (account?.provider === "google") {
        const databaseUser = await prisma.user.upsert({ where: { email: user.email }, update: { name: user.name ?? undefined }, create: { email: user.email, name: user.name } });
        user.id = databaseUser.id;
      }
      if (process.env.MIGRATE_LOCAL_TRIPS_TO_EMAIL === user.email) {
        const local = await prisma.user.findUnique({ where: { email: "local-planner@wdw-planner.local" } });
        if (local && local.id !== user.id) {
          await prisma.trip.updateMany({ where: { userId: local.id }, data: { userId: user.id } });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
};
