import { redirect } from "next/navigation";

// Redirect /docs to home per MVP v1.8 spec (out of scope)
export default function DocsPage() {
  redirect("/");
}
