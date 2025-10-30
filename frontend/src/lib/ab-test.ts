import { cookies } from "next/headers";

export async function getHeadlineVariant(): Promise<"a" | "b"> {
  const cookieStore = await cookies();
  const variant = cookieStore.get("headline_variant");

  if (variant) {
    return variant.value as "a" | "b";
  }

  // Random assignment (50/50)
  const newVariant = Math.random() < 0.5 ? "a" : "b";
  cookieStore.set("headline_variant", newVariant, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return newVariant;
}

// Client-side variant selection (for client components)
export function getHeadlineVariantClient(): "a" | "b" {
  if (typeof window === "undefined") return "a";

  // Check if variant is already set in cookie
  const existingVariant = document.cookie
    .split("; ")
    .find((row) => row.startsWith("headline_variant="))
    ?.split("=")[1] as "a" | "b";

  if (existingVariant) {
    return existingVariant;
  }

  // Random assignment (50/50)
  const newVariant = Math.random() < 0.5 ? "a" : "b";

  // Set cookie for 30 days
  document.cookie = `headline_variant=${newVariant}; max-age=${60 * 60 * 24 * 30}; path=/`;

  return newVariant;
}

// Track conversion events
export function trackConversion(
  event: string,
  variant: "a" | "b",
  metadata?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;

  // Send to analytics service (PostHog, Google Analytics, etc.)
  console.log("A/B Test Conversion:", {
    event,
    variant,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // Example PostHog tracking:
  // if (window.posthog) {
  //   window.posthog.capture(event, {
  //     ab_test_variant: variant,
  //     ...metadata,
  //   });
  // }
}
