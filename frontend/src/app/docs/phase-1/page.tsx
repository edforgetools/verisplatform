import { redirect } from "next/navigation";

// Redirect /docs/phase-1 to home per MVP v1.8 spec (out of scope)
export default function DocsPhase1Page() {
  redirect("/");
}
