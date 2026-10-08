export const CHECKOUT_MONTHLY_SEAT_PRICES = {
  starter: 99,
  team: 179,
} as const;

export function checkoutRenewalDisclosure(plan: "starter" | "team"): string {
  const label = plan === "starter" ? "Starter" : "Team";
  const price = CHECKOUT_MONTHLY_SEAT_PRICES[plan];
  return `${label} is $${price} per seat per month. It renews monthly per seat until canceled. Cancellation stops the next renewal.`;
}
