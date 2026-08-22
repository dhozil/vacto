"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--destructive)]/10">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred. This has been logged and can be
            reported to the development team.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          <Button
            variant="default"
            onClick={() => (window.location.href = "/")}
          >
            Go to homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
