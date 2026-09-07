import { supabase } from "./supabase";

export type DestinyPlan = "pro" | "premium";

export type PaymentResponse = {
  success: boolean;
  payment: {
    id: string;
    reference: string;
    plan: DestinyPlan;
    amount_kobo: number;
    currency: string;
    status: "pending" | "paid" | "failed" | "cancelled";
    checkout_url: string | null;
  };
  instructions: string;
  bank_transfer: {
    bank_name: string;
    account_name: string;
    account_number: string;
    reference: string;
  } | null;
};

export async function createDestinyPayment(plan: DestinyPlan): Promise<PaymentResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Please sign in before making a payment.");

  const { data, error } = await supabase.functions.invoke("create-payment", {
    body: { plan },
  });

  if (error) throw new Error(error.message || "Unable to create payment.");
  if (!data?.success) throw new Error(data?.error || "Unable to create payment.");

  return data as PaymentResponse;
}
