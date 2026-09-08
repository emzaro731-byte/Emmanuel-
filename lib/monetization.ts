export type DestinyPlan = "free" | "pro" | "premium";

// Existing Selar checkout supplied for Destiny AI premium access.
// Keep provider secrets and verification server-side.
export const SELAR_CHECKOUTS = {
  premium: "https://selar.com/66ft71u971",
} as const;

export const DESTINY_PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "₦0",
    description: "Try Destiny AI with a small daily allowance.",
    dailyAiLimit: 20,
    features: ["Basic AI chat", "20 AI requests/day", "Local chat history"],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "₦1,000/month",
    description: "For regular AI users and creators.",
    dailyAiLimit: 200,
    features: ["200 AI requests/day", "Advanced AI modes", "More creation credits", "Priority access"],
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "₦2,000/month",
    description: "Unlock the premium Destiny AI experience.",
    dailyAiLimit: 1000,
    features: ["1,000 AI requests/day", "Premium creation features", "Priority processing", "High usage allowance"],
    checkoutUrl: SELAR_CHECKOUTS.premium,
  },
];

export const CREDIT_PACKS = [
  { id: "credits_500", label: "Starter", price: "₦500", credits: 50 },
  { id: "credits_1000", label: "Creator", price: "₦1,000", credits: 120 },
  { id: "credits_2500", label: "Pro Pack", price: "₦2,500", credits: 350 },
  { id: "credits_5000", label: "Power Pack", price: "₦5,000", credits: 800 },
];
