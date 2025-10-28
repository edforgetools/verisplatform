import { redirect } from "next/navigation";

// Redirect /demo to home per MVP v1.8 spec (out of scope)
export default function DemoPage() {
  redirect("/");
}
