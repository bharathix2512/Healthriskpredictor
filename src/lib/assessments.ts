import { supabase } from "@/integrations/supabase/client";
import type { HealthInput, RiskResult } from "./risk";

export interface SavedAssessment {
  id: string;
  created_at: string;
  total: number;
  level: RiskResult["level"];
  bmi: number;
  note: string | null;
  input: HealthInput;
  components: RiskResult["components"];
  recommendations: RiskResult["recommendations"];
  specialists: string[];
}

export async function saveAssessment(
  userId: string,
  input: HealthInput,
  result: RiskResult,
  note?: string,
) {
  const { error } = await supabase.from("assessments").insert({
    user_id: userId,
    total: result.total,
    level: result.level,
    bmi: result.bmi,
    input: input as unknown as never,
    components: result.components as unknown as never,
    recommendations: result.recommendations as unknown as never,
    specialists: result.specialists as unknown as never,
    note: note ?? null,
  });
  if (error) throw error;
}

export async function listAssessments(): Promise<SavedAssessment[]> {
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedAssessment[];
}

export async function deleteAssessment(id: string) {
  const { error } = await supabase.from("assessments").delete().eq("id", id);
  if (error) throw error;
}
