"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(open, onCancel);

  if (!open) return null;

  const iconColor =
    variant === "destructive"
      ? "text-[var(--destructive)]"
      : variant === "warning"
        ? "text-[var(--warning)]"
        : "text-[var(--accent)]";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="relative z-[61] w-full max-w-md rounded-xl border border-border bg-card shadow-lg"
      >
        <div className="flex items-start gap-3 p-5">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted ${iconColor}`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3
              id="confirm-title"
              className="font-serif text-base font-semibold text-foreground"
            >
              {title}
            </h3>
            {description && (
              <p
                id="confirm-desc"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={
              variant === "destructive"
                ? "destructiveSolid"
                : variant === "warning"
                  ? "destructiveSolid"
                  : "default"
            }
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Processing…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;