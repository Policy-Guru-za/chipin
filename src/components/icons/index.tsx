import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

// UI Icons

export function CheckIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ChevronRightIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ChevronLeftIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function ArrowRightIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export function SparkleIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

export function PlayIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function XIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function MenuIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CopyIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

// Empty State Icons

export function SearchIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export function GiftIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
    </svg>
  );
}

export function HeartIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

export function BoxIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

// Payment Provider Icons

export function PayFastIcon({ className, size = 'lg' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="PayFast"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h4M6 14h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function OzowIcon({ className, size = 'lg' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Ozow"
    >
      <circle cx="12" cy="12" r="10" />
      <path
        d="M8 12l3 3 5-6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SnapScanIcon({ className, size = 'lg' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="SnapScan"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path
        d="M8 8h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z"
        fill="white"
      />
    </svg>
  );
}

// Loading Spinner

export function LoadingSpinner({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn('animate-spin', sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
