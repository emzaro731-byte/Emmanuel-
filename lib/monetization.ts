export type DestinyPlan = "free" | "pro" | "premium";

// Existing Selar checkout supplied for Destiny AI premium access.
// Replace/extend these URLs with separate Selar products when you create Pro/Credits products.
export const SELAR_CHECKOUTS = {
  premium: "https://selar.com/66ft71u971",
} as const;

export const DESTINY_PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "₦0",
    description: "Try Destiny AI with basic daily limits.",
    features: ["Basic AI chat", "Limited usage", "Local chat history"],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "₦2,500/month",
    description: "For regular AI users and creators.",
    features: ["Higher AI limits", "Advanced AI modes", "More creation credits", "Priority access"],
    checkoutUrl: undefined,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "Selar checkout",
    description: "Unlock the premium Destiny AI experience.",
    features: ["High usage limits", "Premium creation features", "Priority processing", "No feature lockouts"],
    checkoutUrl: SELAR_CHECKOUTS.premium,
  },
];

export const CREDIT_PACKS = [
  { id: "credits_500", label: "Starter", price: "₦500", credits: 50 },
  { id: "credits_1000", label: "Creator", price: "₦1,000", credits: 120 },
  { id: "credits_2500", label: "Pro Pack", price: "₦2,500", credits: 350 },
  { id: "credits_5000", label: "Power Pack", price: "₦5,000", credits: 800 },
];
