import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { registerSchema } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

const BCRYPT_WORK_FACTOR = 12;

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const passwordHash = await hash(input.password, BCRYPT_WORK_FACTOR);
    await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });
    return NextResponse.json({ created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "Please check the highlighted fields.", fieldErrors: error.flatten().fieldErrors }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "An account with that email already exists." }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    console.error("Account registration failed", error);
    return NextResponse.json({ message: "We couldn't create your account." }, { status: 500 });
  }
}
