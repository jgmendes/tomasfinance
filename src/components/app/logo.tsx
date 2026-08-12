import { cn } from "@/lib/utils";

/** Marca do Tomas Finance: "T" com uma barra de crescimento. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-9 w-9", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tf-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#tf-grad)" />
      {/* T */}
      <rect x="12" y="13" width="24" height="5.5" rx="2.75" fill="white" />
      <rect x="21.25" y="13" width="5.5" height="19" rx="2.75" fill="white" />
      {/* barras de crescimento */}
      <rect x="29" y="26" width="3.2" height="9" rx="1.6" fill="white" fillOpacity="0.95" />
      <rect x="34" y="22" width="3.2" height="13" rx="1.6" fill="#c4b5fd" />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2 font-bold", className)}>
      <LogoMark className="h-8 w-8" />
      {showText && <span>Tomas Finance</span>}
    </span>
  );
}
