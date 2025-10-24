/**
 * API Documentation page using Redoc
 */

"use client";

import { useEffect, useRef } from "react";
import { Navigation } from "@/components/Navigation";

export default function DocsPage() {
  const redocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadRedoc = async () => {
      const RedocStandalone = (await import("redoc")).RedocStandalone;

      if (redocRef.current) {
        new RedocStandalone({
          specUrl: "/openapi/openapi.yaml",
          options: {
            theme: {
              colors: {
                primary: {
                  main: "#3b82f6",
                },
              },
            },
          },
        }).render(redocRef.current);
      }
    };

    loadRedoc();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div ref={redocRef} className="w-full" />
    </div>
  );
}
