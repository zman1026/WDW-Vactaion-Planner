import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254).transform((value) => value.toLowerCase());
const password = z.string().min(12, "Use at least 12 characters.").max(72, "Password must be 72 characters or fewer.");

export const signInSchema = z.object({ email, password });

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email,
  password,
  confirmPassword: z.string(),
}).superRefine(({ password, confirmPassword }, context) => {
  if (password !== confirmPassword) context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
});
