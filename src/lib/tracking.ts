import { supabase } from "@/integrations/supabase/client";

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  steps: number | null;
  resting_hr: number | null;
  mood: number | null;
  stress: number | null;
  weight_kg: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
  water_glasses: number | null;
  note: string | null;
  created_at: string;
}

export type DailyLogInput = Partial<Omit<DailyLog, "id" | "user_id" | "created_at">> & {
  log_date: string;
};

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  category: string;
  target_per_week: number;
  archived: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  done_date: string;
}

export interface Goal {
  id: string;
  title: string;
  metric: string;
  start_value: number | null;
  target_value: number;
  due_date: string | null;
  achieved: boolean;
  created_at: string;
}

export interface AiInsight {
  id: string;
  kind: string;
  content: string;
  created_at: string;
}

/* ---------- daily logs ---------- */

export async function listLogs(limit = 90): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .order("log_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as DailyLog[];
}

export async function upsertLog(userId: string, input: DailyLogInput) {
  const { error } = await supabase
    .from("daily_logs")
    .upsert({ ...input, user_id: userId } as never, { onConflict: "user_id,log_date" });
  if (error) throw error;
}

export async function deleteLog(id: string) {
  const { error } = await supabase.from("daily_logs").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- habits ---------- */

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Habit[];
}

export async function createHabit(
  userId: string,
  habit: { title: string; emoji: string; category: string; target_per_week: number },
) {
  const { error } = await supabase.from("habits").insert({ ...habit, user_id: userId } as never);
  if (error) throw error;
}

export async function archiveHabit(id: string) {
  const { error } = await supabase.from("habits").update({ archived: true } as never).eq("id", id);
  if (error) throw error;
}

export async function listHabitLogs(days = 60): Promise<HabitLog[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("habit_logs")
    .select("id, habit_id, done_date")
    .gte("done_date", since);
  if (error) throw error;
  return (data ?? []) as unknown as HabitLog[];
}

export async function toggleHabit(userId: string, habitId: string, date: string, done: boolean) {
  if (done) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("done_date", date);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("habit_logs")
    .insert({ habit_id: habitId, user_id: userId, done_date: date } as never);
  if (error) throw error;
}

/* ---------- goals ---------- */

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Goal[];
}

export async function createGoal(
  userId: string,
  goal: {
    title: string;
    metric: string;
    start_value: number | null;
    target_value: number;
    due_date: string | null;
  },
) {
  const { error } = await supabase.from("goals").insert({ ...goal, user_id: userId } as never);
  if (error) throw error;
}

export async function setGoalAchieved(id: string, achieved: boolean) {
  const { error } = await supabase.from("goals").update({ achieved } as never).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- insights ---------- */

export async function listInsights(): Promise<AiInsight[]> {
  const { data, error } = await supabase
    .from("ai_insights")
    .select("id, kind, content, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as AiInsight[];
}

export async function saveInsight(userId: string, kind: string, content: string) {
  const { error } = await supabase
    .from("ai_insights")
    .insert({ user_id: userId, kind, content } as never);
  if (error) throw error;
}
