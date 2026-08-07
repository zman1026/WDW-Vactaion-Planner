import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const databaseUser = await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name },
        create: { email: user.email, name: user.name },
      });

      if (process.env.MIGRATE_LOCAL_TRIPS_TO_EMAIL === user.email) {
        const local = await prisma.user.findUnique({ where: { email: "local-planner@wdw-planner.local" } });
        if (local && local.id !== databaseUser.id) {
          await prisma.trip.updateMany({ where: { userId: local.id }, data: { userId: databaseUser.id } });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const databaseUser = await prisma.user.findUnique({ where: { email: user.email }, select: { id: true } });
        token.userId = databaseUser?.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
};
