"use client";

import { useState } from "react";
import { LayoutTemplate, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  CONTRACT_TEMPLATES,
  renderTemplate,
  hasAllRequiredFields,
  unresolvedPlaceholders,
  type ContractTemplate,
} from "@/lib/contracts/templates";

interface TemplatePickerProps {
  onApply: (terms: string) => void;
}

export function TemplatePicker({ onApply }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ContractTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");

  const selectTemplate = (t: ContractTemplate) => {
    setSelected(t);
    setValues({});
    setPreview("");
  };

  const setField = (key: string, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (selected) setPreview(renderTemplate(selected, next));
  };

  const apply = () => {
    if (!selected) return;
    const rendered = renderTemplate(selected, values);
    onApply(rendered);
    setOpen(false);
    setSelected(null);
    setValues({});
    setPreview("");
  };

  const ready = selected ? hasAllRequiredFields(selected, values) : false;
  const unresolved =
    preview && selected ? unresolvedPlaceholders(preview) : [];

  return (
    <div className="rounded-lg border border-dashed border-muted p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <LayoutTemplate className="h-4 w-4 text-[var(--accent)]" />
          Start from a template
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTRACT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTemplate(t)}
                className={
                  "rounded-lg border p-3 text-left transition-colors " +
                  (selected?.id === t.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-border hover:bg-muted/50")
                }
              >
                <span className="block text-sm font-semibold text-foreground">
                  {t.name}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t.tagline}
                </span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {selected.fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={`tmpl-${f.key}`}>
                      {f.label}
                      {f.required && (
                        <span className="text-[var(--destructive)]"> *</span>
                      )}
                    </Label>
                    <Input
                      id={`tmpl-${f.key}`}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>

              {preview && ready && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Preview
                  </p>
                  <Textarea
                    readOnly
                    value={preview}
                    rows={5}
                    className="text-xs"
                  />
                  {unresolved.length > 0 && (
                    <p className="text-[11px] text-[var(--warning)]">
                      Optional fields still empty — these will stay as
                      placeholders:{" "}
                      {unresolved.map((u) => `{{${u}}}`).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {!ready && selected && (
                <p className="text-[11px] text-muted-foreground">
                  Fill the required fields ({selected.fields.length}) to see the
                  rendered preview.
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={apply}
                  disabled={!ready}
                >
                  {ready
                    ? "Fill terms with template"
                    : "Fill the required fields to continue"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TemplatePicker;