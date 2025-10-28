import { redirect } from "next/navigation";

// Redirect /proof/[id] to home per MVP v1.8 spec (out of scope)
export default function ProofIdPage() {
  redirect("/");
}
