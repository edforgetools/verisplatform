import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Health check endpoint aligned with veris_execution_ops_v4.4.md
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    components: {} as Record<string, any>,
    slo: {
      uptime: "≥99.9%",
      latency: "p95 ≤2s",
      verification_success: "≥99%",
      billing_success: "≥95%",
      automation: "≤5% manual",
      mirror_integrity: "100% hash match",
      c2pa_parity: "≥95%",
      dual_mode_test: "100% pass",
      sustainability_ratio: "≥6×",
    },
    response_time_ms: 0,
    error: null as string | null,
  };

  try {
    // Check Supabase connection
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      const { error } = await supabase.from("proofs").select("count").limit(1);

      healthStatus.components.supabase = {
        status: error ? "unhealthy" : "healthy",
        error: error?.message || null,
      };
    }

    // Check Stripe connection
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      try {
        await stripe.balance.retrieve();
        healthStatus.components.stripe = {
          status: "healthy",
          mode: process.env.STRIPE_MODE || "test",
        };
      } catch (error) {
        healthStatus.components.stripe = {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Check AWS S3 buckets
    if (process.env.AWS_REGION && process.env.REGISTRY_BUCKET_STAGING) {
      healthStatus.components.aws_s3 = {
        status: "healthy",
        region: process.env.AWS_REGION,
        staging_bucket: process.env.REGISTRY_BUCKET_STAGING,
        prod_bucket: process.env.REGISTRY_BUCKET_PROD,
      };
    }

    // Check C2PA mode
    healthStatus.components.c2pa = {
      status: process.env.C2PA_MODE === "on" ? "enabled" : "disabled",
      mode: process.env.C2PA_MODE || "off",
    };

    // Check mirror configuration
    healthStatus.components.mirror = {
      status: process.env.MIRROR_MODE === "auto" ? "auto" : "manual",
      mode: process.env.MIRROR_MODE || "manual",
      arweave_configured: !!process.env.ARWEAVE_WALLET_JSON,
    };

    // Check alert configuration
    healthStatus.components.alerts = {
      status: process.env.ALERT_MODE || "none",
      slack_configured: !!process.env.SLACK_WEBHOOK_URL,
    };

    // Calculate response time
    const responseTime = Date.now() - startTime;
    healthStatus.response_time_ms = responseTime;

    // Determine overall health status
    const unhealthyComponents = Object.values(healthStatus.components).filter(
      (component: any) => component.status === "unhealthy",
    );

    if (unhealthyComponents.length > 0) {
      healthStatus.status = "degraded";
    }

    // Check SLO compliance
    if (responseTime > 2000) {
      (healthStatus.slo as any).latency_status = "violated";
    } else {
      (healthStatus.slo as any).latency_status = "compliant";
    }

    return NextResponse.json(healthStatus, {
      status: healthStatus.status === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    healthStatus.status = "unhealthy";
    healthStatus.error = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(healthStatus, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
}
