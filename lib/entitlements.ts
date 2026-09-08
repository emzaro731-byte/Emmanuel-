import { supabase } from "./supabase";

export type DestinyPlan = "free" | "pro" | "premium";

export type DestinyEntitlement = {
  user_id: string;
  plan: DestinyPlan;
  credits: number;
  daily_ai_limit: number;
  lifetime_ai_requests: number;
  expires_at: string | null;
  updated_at: string;
};

export async function getDestinyEntitlement(): Promise<DestinyEntitlement> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Please sign in first.");

  const { data, error } = await supabase
    .from("destiny_entitlements")
    .select("user_id, plan, credits, daily_ai_limit, lifetime_ai_requests, expires_at, updated_at")
    .eq("user_id", session.session.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message || "Unable to load your plan.");

  if (data) return data as DestinyEntitlement;

  return {
    user_id: session.session.user.id,
    plan: "free",
    credits: 0,
    daily_ai_limit: 20,
    lifetime_ai_requests: 0,
    expires_at: null,
    updated_at: new Date().toISOString(),
  };
}

export async function reserveDestinyAIRequest() {
  const { data, error } = await supabase.rpc("reserve_destiny_ai_request");
  if (error) throw new Error(error.message || "Unable to check your AI allowance.");
  return data as {
    allowed: boolean;
    reason?: string;
    plan: DestinyPlan;
    daily_limit: number;
    used: number;
    credits: number;
  };
}
