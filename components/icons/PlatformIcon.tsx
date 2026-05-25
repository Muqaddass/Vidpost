import type { Platform } from "@/lib/types/database";

interface Props {
  platform: Platform;
  className?: string;
}

// Simple inline SVG glyphs for each platform — avoids 3rd-party icon dependencies
// and uses currentColor so the parent can color them via Tailwind.
export function PlatformIcon({ platform, className = "size-5" }: Props) {
  switch (platform) {
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M16.5 5.5a4.5 4.5 0 0 0 4.5 4.5v3a7.5 7.5 0 0 1-4.5-1.5v6a6 6 0 1 1-6-6c.34 0 .67.03 1 .09v3.16a3 3 0 1 0 2 2.83V2h3v3.5z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.9.4A3 3 0 0 0 1 7.5C.6 9.4.6 12 .6 12s0 2.6.4 4.5A3 3 0 0 0 3.1 18.6C5 19 12 19 12 19s7 0 8.9-.4a3 3 0 0 0 2.1-2.1c.4-1.9.4-4.5.4-4.5s0-2.6-.4-4.5zM10 15.5v-7l6 3.5-6 3.5z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05A4.16 4.16 0 0 1 17.5 8.6c4 0 4.74 2.64 4.74 6.07V21H18.2v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21H10V9z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 4.83 2.97 8.96 7.18 10.65-.1-.9-.18-2.3.04-3.3.2-.86 1.3-5.5 1.3-5.5s-.34-.66-.34-1.65c0-1.55.9-2.7 2.02-2.7.95 0 1.41.72 1.41 1.57 0 .96-.61 2.4-.93 3.73-.26 1.12.56 2.03 1.66 2.03 2 0 3.53-2.1 3.53-5.13 0-2.68-1.93-4.55-4.69-4.55-3.2 0-5.07 2.4-5.07 4.87 0 .96.37 2 .83 2.55.09.11.1.21.08.32-.08.36-.27 1.12-.31 1.27-.05.21-.16.25-.37.15-1.38-.65-2.24-2.69-2.24-4.32 0-3.52 2.56-6.76 7.38-6.76 3.87 0 6.88 2.76 6.88 6.44 0 3.85-2.43 6.95-5.8 6.95-1.13 0-2.2-.59-2.56-1.29l-.7 2.66c-.25.97-.93 2.18-1.39 2.92.95.29 1.96.45 3 .45 6.35 0 11.5-5.15 11.5-11.5S18.35.5 12 .5z" />
        </svg>
      );
  }
}
