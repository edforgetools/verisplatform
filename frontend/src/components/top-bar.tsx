import Link from "next/link";

export function TopBar() {
  return (
    <header className="border-b bg-white py-3">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Veris
        </Link>
      </div>
    </header>
  );
}
