export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="Vacto"
      width={size}
      height={size}
      className={`select-none ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}

export default Logo;