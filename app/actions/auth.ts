"use server";

import { redirect } from "next/navigation";
import {
  getUsernameValidationError,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth/username";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

function getPasswordValidationError(password: string) {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  return null;
}

export type AuthActionState = {
  error?: string;
};

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const usernameError = getUsernameValidationError(username);
  if (usernameError) {
    return { error: usernameError };
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const normalizedUsername = normalizeUsername(username);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existingProfile) {
    return { error: "That username is already taken." };
  }

  const { error } = await supabase.auth.signUp({
    email: usernameToEmail(normalizedUsername),
    password,
    options: {
      data: {
        username: normalizedUsername,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const usernameError = getUsernameValidationError(username);
  if (usernameError) {
    return { error: usernameError };
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return { error: "Invalid username or password." };
  }

  redirect("/");
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}
