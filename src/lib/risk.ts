export type Smoking = "never" | "former" | "current";
export type Alcohol = "none" | "moderate" | "heavy";
export type Exercise = "sedentary" | "light" | "moderate" | "active";

export interface HealthInput {
  age: number;
  sex: "female" | "male" | "other";
  heightCm: number;
  weightKg: number;
  systolic: number;
  diastolic: number;
  fastingGlucose: number;
  hba1c: number; // %
  diabetesDiagnosed: boolean;
  ldl: number; // mg/dL
  hdl: number; // mg/dL
  triglycerides: number; // mg/dL
  crp: number; // hs-CRP mg/L
  smoking: Smoking;
  alcohol: Alcohol;
  exercise: Exercise;
  exerciseMinutes: number; // minutes per week
  sleepHours: number;
  stress: number; // 1-10
  conditions: string[]; // heart-disease, hypertension, cholesterol
  familyHistory: string[]; // diabetes, heart-disease, stroke
  priorMI: boolean; // previous heart attack
  priorStroke: boolean; // previous stroke or TIA
  priorEventYears: number; // years since the most recent event (0 = within a year)
  onCardiacMeds: boolean;
}

export const defaultInput: HealthInput = {
  age: 35,
  sex: "female",
  heightCm: 170,
  weightKg: 68,
  systolic: 118,
  diastolic: 76,
  fastingGlucose: 92,
  hba1c: 5.3,
  diabetesDiagnosed: false,
  ldl: 110,
  hdl: 55,
  triglycerides: 120,
  crp: 1,
  smoking: "never",
  alcohol: "none",
  exercise: "moderate",
  exerciseMinutes: 150,
  sleepHours: 7,
  stress: 4,
  conditions: [],
  familyHistory: [],
  priorMI: false,
  priorStroke: false,
  priorEventYears: 0,
  onCardiacMeds: false,
};

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface Recommendation {
  category: "diet" | "exercise" | "medical" | "lifestyle";
  title: string;
  detail: string;
  severity: "info" | "watch" | "urgent";
}

export interface RiskResult {
  bmi: number;
  bmiLabel: string;
  components: { key: string; label: string; score: number; max: number }[];
  total: number;
  level: RiskLevel;
  levelCopy: string;
  specialists: string[];
  recommendations: Recommendation[];
}

export function bmiOf(heightCm: number, weightKg: number) {
  const m = heightCm / 100;
  if (!m) return 0;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese";
  return "Severe obesity";
}

export function hba1cLabel(v: number) {
  if (!v) return "—";
  if (v < 5.7) return "Normal";
  if (v < 6.5) return "Prediabetic range";
  return "Diabetic range";
}

export function crpLabel(v: number) {
  if (v < 1) return "Low inflammatory risk";
  if (v <= 3) return "Average inflammatory risk";
  if (v <= 10) return "Elevated risk";
  return "Very high — rule out infection";
}

export function ldlLabel(v: number) {
  if (v < 100) return "Optimal";
  if (v < 130) return "Near optimal";
  if (v < 160) return "Borderline high";
  if (v < 190) return "High";
  return "Very high";
}

export function exerciseLabel(min: number) {
  if (min < 60) return "Well below guideline — double risk";
  if (min < 150) return "Below the 150 min guideline";
  if (min <= 300) return "Optimal range";
  return "Above guideline";
}

export function assess(input: HealthInput): RiskResult {
  const bmi = bmiOf(input.heightCm, input.weightKg);

  // Body composition — max 15
  let bmiScore = 0;
  if (bmi >= 25 && bmi < 30) bmiScore = 4;
  else if (bmi >= 30 && bmi < 35) bmiScore = 9;
  else if (bmi >= 35) bmiScore = 15;
  else if (bmi > 0 && bmi < 18.5) bmiScore = 4;

  // Blood pressure — max 20
  let bpScore = 0;
  const { systolic: s, diastolic: d } = input;
  if (s >= 160 || d >= 100) bpScore = 20;
  else if (s >= 140 || d >= 90) bpScore = 16;
  else if (s >= 130 || d >= 80) bpScore = 10;
  else if (s >= 120) bpScore = 4;

  // Blood sugar — max 15 (HbA1c weighted above a single fasting value)
  let a1cScore = 0;
  if (input.hba1c >= 8) a1cScore = 11;
  else if (input.hba1c >= 6.5) a1cScore = 9;
  else if (input.hba1c >= 5.7) a1cScore = 5;
  let glucoseScore = 0;
  if (input.fastingGlucose >= 126) glucoseScore = 4;
  else if (input.fastingGlucose >= 100) glucoseScore = 2;
  let sugarScore = a1cScore + glucoseScore;
  if (input.diabetesDiagnosed) sugarScore = Math.max(sugarScore, 9) + 2;
  sugarScore = Math.min(15, sugarScore);

  // Lipids — max 15
  let lipidScore = 0;
  if (input.ldl >= 190) lipidScore += 9;
  else if (input.ldl >= 160) lipidScore += 7;
  else if (input.ldl >= 130) lipidScore += 4;
  else if (input.ldl >= 100) lipidScore += 2;
  const lowHdl = input.sex === "male" ? 40 : 50;
  if (input.hdl && input.hdl < lowHdl) lipidScore += 3;
  else if (input.hdl >= 60) lipidScore -= 2;
  if (input.triglycerides >= 500) lipidScore += 4;
  else if (input.triglycerides >= 200) lipidScore += 3;
  else if (input.triglycerides >= 150) lipidScore += 1;
  lipidScore = Math.max(0, Math.min(15, lipidScore));

  // Inflammation (hs-CRP) — max 10
  let crpScore = 0;
  if (input.crp > 10) crpScore = 10;
  else if (input.crp > 3) crpScore = 7;
  else if (input.crp >= 1) crpScore = 3;

  // Lifestyle — max 15
  let lifestyle = 0;
  if (input.smoking === "current") lifestyle += 8;
  else if (input.smoking === "former") lifestyle += 2;
  if (input.alcohol === "heavy") lifestyle += 4;
  else if (input.alcohol === "moderate") lifestyle += 1;
  if (input.stress >= 8) lifestyle += 3;
  if (input.exerciseMinutes < 60) lifestyle += 6;
  else if (input.exerciseMinutes < 150) lifestyle += 3;
  else if (input.exerciseMinutes > 300) lifestyle += 1;
  if (input.sleepHours < 6 || input.sleepHours > 9) lifestyle += 2;
  lifestyle = Math.min(15, lifestyle);

  // History — max 10
  let history = 0;
  if (input.priorMI) history += input.priorEventYears <= 1 ? 10 : 8;
  if (input.priorStroke) history += input.priorEventYears <= 1 ? 8 : 6;
  if (input.conditions.includes("heart-disease")) history += 4;
  if (input.conditions.includes("hypertension")) history += 2;
  if (input.conditions.includes("cholesterol")) history += 2;
  history += input.familyHistory.length * 1.5;
  if (input.onCardiacMeds && (input.priorMI || input.priorStroke)) history -= 1;
  history = Math.max(0, Math.min(10, Math.round(history)));

  const components = [
    { key: "bp", label: "Blood pressure", score: bpScore, max: 20 },
    { key: "bmi", label: "Body composition", score: bmiScore, max: 15 },
    { key: "sugar", label: "Blood sugar (HbA1c)", score: sugarScore, max: 15 },
    { key: "lipids", label: "Lipid panel", score: lipidScore, max: 15 },
    { key: "lifestyle", label: "Lifestyle & activity", score: lifestyle, max: 15 },
    { key: "crp", label: "Inflammation (hs-CRP)", score: crpScore, max: 10 },
    { key: "history", label: "Medical & family history", score: history, max: 10 },
  ];

  const total = Math.min(100, Math.round(components.reduce((a, c) => a + c.score, 0)));

  const level: RiskLevel =
    total <= 20 ? "low" : total <= 40 ? "moderate" : total <= 70 ? "high" : "critical";

  const levelCopy = {
    low: "Your markers look steady. Keep the habits that are working.",
    moderate: "A few markers are drifting. Small changes now go a long way.",
    high: "Several markers need attention — a consultation is recommended.",
    critical: "These markers warrant prompt medical attention.",
  }[level];

  const specialists: string[] = [];
  if (input.priorMI || input.priorStroke) specialists.push("Cardiologist (secondary prevention)");
  if (total > 40 && bpScore >= 10) specialists.push("Cardiologist");
  if (lipidScore >= 7 || crpScore >= 7) specialists.push("Lipid or preventive cardiology clinic");
  if (sugarScore >= 9) specialists.push("Endocrinologist");
  if (total > 50 && input.stress >= 8) specialists.push("Psychiatrist or counsellor");
  if (total > 70) specialists.push("General physician (urgent)");

  const recommendations: Recommendation[] = [];

  if (input.priorMI || input.priorStroke)
    recommendations.push({
      category: "medical",
      title: "Secondary prevention is your top priority",
      detail:
        "A previous heart attack or stroke raises the odds of another event many times over. Confirm you are on guideline statin, blood-pressure and antiplatelet therapy, and keep LDL below 70 mg/dL.",
      severity: "urgent",
    });
  if (input.ldl >= 160)
    recommendations.push({
      category: "medical",
      title: `LDL of ${input.ldl} mg/dL is high`,
      detail:
        "LDL above 160 mg/dL is associated with roughly 30% higher heart attack risk. Ask about statin therapy, cut saturated fat and add 10g/day of soluble fibre.",
      severity: "urgent",
    });
  else if (input.ldl >= 130)
    recommendations.push({
      category: "diet",
      title: "Bring LDL back under 100 mg/dL",
      detail:
        "Swap saturated fat for olive oil, nuts and oily fish, and add oats or legumes daily. Recheck your panel in 3 months.",
      severity: "watch",
    });
  if (input.triglycerides >= 200)
    recommendations.push({
      category: "diet",
      title: "Triglycerides are elevated",
      detail:
        "Cut refined carbohydrate, sugary drinks and alcohol first — triglycerides respond fast, often within weeks.",
      severity: input.triglycerides >= 500 ? "urgent" : "watch",
    });
  if (input.hdl && input.hdl < (input.sex === "male" ? 40 : 50))
    recommendations.push({
      category: "exercise",
      title: "Raise protective HDL",
      detail:
        "Aerobic exercise most days plus stopping smoking are the two reliable ways to lift HDL cholesterol.",
      severity: "info",
    });
  if (input.crp > 3)
    recommendations.push({
      category: "medical",
      title: `hs-CRP of ${input.crp} mg/L signals inflammation`,
      detail:
        "CRP above 3.0 predicts heart disease even when cholesterol looks fine. Retest when you are free of infection, and address sleep, dental health, weight and smoking.",
      severity: input.crp > 10 ? "urgent" : "watch",
    });
  if (input.hba1c >= 6.5 || input.diabetesDiagnosed)
    recommendations.push({
      category: "medical",
      title: `HbA1c of ${input.hba1c}% is in the diabetic range`,
      detail:
        "Work with a clinician on a target of under 7%. Every 1% drop meaningfully lowers vascular complications.",
      severity: "urgent",
    });
  else if (input.hba1c >= 5.7)
    recommendations.push({
      category: "medical",
      title: `HbA1c of ${input.hba1c}% is prediabetic`,
      detail:
        "5.7–6.4% is the reversible window. Structured activity plus a 5–7% weight change cuts progression to diabetes by more than half.",
      severity: "watch",
    });
  if (input.exerciseMinutes < 60)
    recommendations.push({
      category: "exercise",
      title: `Only ${input.exerciseMinutes} min of activity per week`,
      detail:
        "Under 60 minutes a week roughly doubles cardiovascular risk. Build to 150–300 minutes — start with a brisk 20-minute walk five days a week.",
      severity: "urgent",
    });
  else if (input.exerciseMinutes < 150)
    recommendations.push({
      category: "exercise",
      title: "Close the gap to 150 minutes a week",
      detail: `You are at ${input.exerciseMinutes} min. Add two 30-minute sessions to reach the guideline range of 150–300 min.`,
      severity: "watch",
    });
  if (bpScore >= 16)
    recommendations.push({
      category: "medical",
      title: "Track blood pressure at home",
      detail:
        "Log morning and evening readings for two weeks and bring the log to your clinician. Reduce sodium below 2g/day.",
      severity: bpScore >= 20 ? "urgent" : "watch",
    });
  if (bmiScore > 0)
    recommendations.push({
      category: "diet",
      title: "Rebalance your plate",
      detail:
        "Aim for half vegetables, a quarter whole grains, a quarter protein. A 5–7% weight change measurably lowers risk.",
      severity: bmiScore >= 9 ? "watch" : "info",
    });
  if (input.smoking === "current")
    recommendations.push({
      category: "lifestyle",
      title: "Quitting smoking is the single biggest lever",
      detail: "Risk begins dropping within weeks. Ask about nicotine replacement or a quit line.",
      severity: "urgent",
    });
  if (input.sleepHours < 6 || input.sleepHours > 9)
    recommendations.push({
      category: "lifestyle",
      title: "Anchor your sleep window",
      detail: "Target 7–8 hours with a consistent wake time; irregular sleep raises metabolic risk.",
      severity: "info",
    });
  if (input.stress >= 8)
    recommendations.push({
      category: "lifestyle",
      title: "Add a daily downshift",
      detail: "Ten minutes of breathwork or a walk without your phone lowers resting blood pressure.",
      severity: "watch",
    });
  if (recommendations.length === 0)
    recommendations.push({
      category: "lifestyle",
      title: "Stay the course",
      detail: "Nothing flagged. Re-check your numbers every 6–12 months to catch drift early.",
      severity: "info",
    });

  return {
    bmi,
    bmiLabel: bmiLabel(bmi),
    components,
    total,
    level,
    levelCopy,
    specialists,
    recommendations,
  };
}
