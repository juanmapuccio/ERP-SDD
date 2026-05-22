"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/core/auth/auth-cookies";
import { createSupabaseServerClient } from "@/core/api/supabase";

async function getAuthenticatedClient() {
  const accessToken = await getAccessToken();
  return createSupabaseServerClient({ accessToken: accessToken ?? undefined });
}

export async function addTodo(formData: FormData) {
  const title = formData.get("title") as string;

  if (!title?.trim()) {
    return { error: "Title is required" };
  }

  const supabase = await getAuthenticatedClient();
  const { error } = await supabase.database
    .from("todos")
    .insert({ title: title.trim(), is_complete: false });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/protected");
  return { success: true };
}

export async function toggleTodo(id: number, isComplete: boolean) {
  const supabase = await getAuthenticatedClient();
  const { error } = await supabase.database
    .from("todos")
    .update({ is_complete: isComplete })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/protected");
  return { success: true };
}

export async function deleteTodo(id: number) {
  const supabase = await getAuthenticatedClient();
  const { error } = await supabase.database
    .from("todos")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/protected");
  return { success: true };
}
