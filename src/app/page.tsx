import { TasksPage } from "@/components/tasks-page";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/tasks";

export default async function Home() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  // RLS already limits both queries to the logged-in user's rows.
  const [{ data: profile }, { data: tasks, error }] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", userId!).single(),
    supabase
      .from("user_tasks")
      .select("id, title, progress, created_at, updated_at")
      .order("created_at", { ascending: false })
      .overrideTypes<Task[], { merge: false }>(),
  ]);

  return (
    <TasksPage
      displayName={profile?.name ?? profile?.email ?? "there"}
      tasks={tasks ?? []}
      loadFailed={!!error}
    />
  );
}
