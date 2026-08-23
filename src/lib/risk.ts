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
  diabetesDiagnosed: boolean;
  smoking: Smoking;
  alcohol: Alcohol;
  exercise: Exercise;
  sleepHours: number;
  stress: number; // 1-10
  conditions: string[]; // heart-disease, hypertension, cholesterol
  familyHistory: string[]; // diabetes, heart-disease, stroke
}

export const defaultInput: HealthInput = {
  age: 35,
  sex: "female",
  heightCm: 170,
  weightKg: 68,
  systolic: 118,
  diastolic: 76,
  fastingGlucose: 92,
  diabetesDiagnosed: false,
  smoking: "never",
  alcohol: "none",
  exercise: "moderate",
  sleepHours: 7,
  stress: 4,
  conditions: [],
  familyHistory: [],
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

export function assess(input: HealthInput): RiskResult {
  const bmi = bmiOf(input.heightCm, input.weightKg);

  let bmiScore = 0;
  if (bmi >= 25 && bmi < 30) bmiScore = 5;
  else if (bmi >= 30 && bmi < 35) bmiScore = 15;
  else if (bmi >= 35) bmiScore = 25;

  let bpScore = 0;
  const { systolic: s, diastolic: d } = input;
  if (s >= 140 || d >= 90) bpScore = 25;
  else if (s >= 130 || d >= 80) bpScore = 15;
  else if (s >= 120) bpScore = 5;

  let sugarScore = 0;
  if (input.fastingGlucose >= 126) sugarScore = 20;
  else if (input.fastingGlucose >= 100) sugarScore = 10;
  if (input.diabetesDiagnosed) sugarScore = Math.min(20, sugarScore + 5);

  let lifestyle = 0;
  if (input.smoking === "current") lifestyle += 10;
  else if (input.smoking === "former") lifestyle += 2;
  if (input.alcohol === "heavy") lifestyle += 5;
  else if (input.alcohol === "moderate") lifestyle += 2;
  if (input.stress >= 8) lifestyle += 5;
  if (input.exercise === "sedentary") lifestyle += 5;
  else if (input.exercise === "light") lifestyle += 2;
  if (input.sleepHours < 6 || input.sleepHours > 9) lifestyle += 3;
  lifestyle = Math.min(20, lifestyle);

  let history = 0;
  if (input.conditions.includes("heart-disease")) history += 5;
  if (input.conditions.includes("hypertension")) history += 3;
  if (input.conditions.includes("cholesterol")) history += 2;
  history += input.familyHistory.length * 2;
  history = Math.min(10, history);

  const components = [
    { key: "bmi", label: "Body composition", score: bmiScore, max: 25 },
    { key: "bp", label: "Blood pressure", score: bpScore, max: 25 },
    { key: "sugar", label: "Blood sugar", score: sugarScore, max: 20 },
    { key: "lifestyle", label: "Lifestyle", score: lifestyle, max: 20 },
    { key: "history", label: "Medical history", score: history, max: 10 },
  ];

  const total = Math.min(100, components.reduce((a, c) => a + c.score, 0));

  const level: RiskLevel =
    total <= 20 ? "low" : total <= 40 ? "moderate" : total <= 70 ? "high" : "critical";

  const levelCopy = {
    low: "Your markers look steady. Keep the habits that are working.",
    moderate: "A few markers are drifting. Small changes now go a long way.",
    high: "Several markers need attention — a consultation is recommended.",
    critical: "These markers warrant prompt medical attention.",
  }[level];

  const specialists: string[] = [];
  if (total > 40 && bpScore >= 15) specialists.push("Cardiologist");
  if (total > 60 && sugarScore >= 10) specialists.push("Endocrinologist");
  if (total > 50 && input.stress >= 8) specialists.push("Psychiatrist or counsellor");
  if (total > 70) specialists.push("General physician (urgent)");

  const recommendations: Recommendation[] = [];
  if (bmiScore > 0)
    recommendations.push({
      category: "diet",
      title: "Rebalance your plate",
      detail:
        "Aim for half vegetables, a quarter whole grains, a quarter protein. A 5–7% weight change measurably lowers risk.",
      severity: bmiScore >= 15 ? "watch" : "info",
    });
  if (bpScore >= 15)
    recommendations.push({
      category: "medical",
      title: "Track blood pressure at home",
      detail:
        "Log morning and evening readings for two weeks and bring the log to your clinician. Reduce sodium below 2g/day.",
      severity: bpScore >= 25 ? "urgent" : "watch",
    });
  if (sugarScore >= 10)
    recommendations.push({
      category: "medical",
      title: "Confirm glucose with an HbA1c test",
      detail:
        "A single fasting value isn't conclusive. Pair it with an HbA1c and cut added sugar in drinks first.",
      severity: sugarScore >= 20 ? "urgent" : "watch",
    });
  if (input.smoking === "current")
    recommendations.push({
      category: "lifestyle",
      title: "Quitting smoking is the single biggest lever",
      detail: "Risk begins dropping within weeks. Ask about nicotine replacement or a quit line.",
      severity: "urgent",
    });
  if (input.exercise === "sedentary" || input.exercise === "light")
    recommendations.push({
      category: "exercise",
      title: "Build to 150 minutes a week",
      detail: "Start with a brisk 20-minute walk after your largest meal, five days a week.",
      severity: "info",
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
