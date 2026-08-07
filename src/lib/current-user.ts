import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const LOCAL_USER_EMAIL = "local-planner@wdw-planner.local";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}
