import { redirect } from "next/navigation";

// Redirect /docs/api to home per MVP v1.8 spec (out of scope)
export default function DocsApiPage() {
  redirect("/");
}
