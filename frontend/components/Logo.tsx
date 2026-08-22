import { cn } from "@/lib/utils";

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "gradient-brand rounded-xl flex items-center justify-center text-white ring-1 ring-white/20 shadow-[0_2px_8px_-2px_rgb(31_77_58/0.5)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        className="font-serif font-semibold tracking-tight select-none"
        style={{ fontSize: size * 0.42 }}
      >
        P
      </span>
    </div>
  );
}