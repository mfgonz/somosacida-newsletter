/**
 * Inline stroke icons, sized to the type and inheriting currentColor.
 *
 * Kept as local SVG rather than an icon dependency: there are few of them, and
 * shipping a whole library into an email tool is not worth the bytes.
 */

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconContent({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 4.5h16M4 10h16M4 15.5h11M4 21h7" />
    </svg>
  );
}

export function IconAudience({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <path d="M16.5 5.4a3.2 3.2 0 0 1 0 5.9M18 14.4c2 .8 3.3 2.6 3.3 5.1" />
    </svg>
  );
}

/** Beaker — reads as "try it first", distinct from the send action. */
export function IconTest({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9.5 3v6.2L4.6 17.8A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-3.2L14.5 9.2V3" />
      <path d="M8 3h8M7.2 15h9.6" />
    </svg>
  );
}

export function IconSchedule({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4M12 14v3l2 1" />
    </svg>
  );
}

export function IconIdentity({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.6 16.4c.5-1.5 1.8-2.3 3.4-2.3s2.9.8 3.4 2.3M15 10h4M15 13.5h4" />
    </svg>
  );
}

export function IconWebhook({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <circle cx="12" cy="5.5" r="2.5" />
      <path d="M10.8 7.8 8 14.9M13.2 7.8 16 14.9M9 17.5h6" />
    </svg>
  );
}

export function IconSend({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" />
    </svg>
  );
}
