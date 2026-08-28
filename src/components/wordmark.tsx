import { cn } from "@/lib/utils";

/**
 * The ácida wordmark, set in the brand grotesque rather than shipped as an
 * image, so it stays crisp at any size and inherits the current text colour.
 * Swap in the real logo file here if you'd rather use the drawn original.
 */
export function Wordmark({
  className,
  showRegistered = true,
}: {
  className?: string;
  showRegistered?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-display font-extrabold leading-none tracking-tight text-ink",
        className,
      )}
    >
      ácida
      {showRegistered && (
        <sup className="ml-[0.08em] align-super text-[0.42em] font-semibold">
          ®
        </sup>
      )}
    </span>
  );
}

/** Small uppercase letterspaced label, matching the site's nav and eyebrows. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.18em] text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
