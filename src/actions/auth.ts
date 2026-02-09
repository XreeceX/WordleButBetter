"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().min(1).optional(),
});

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const { email, name } = parsed.data;
  const password = parsed.data.password;

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "Email already registered" };

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    id,
    email,
    name: name ?? null,
    passwordHash,
  });

  return { success: true };
}
