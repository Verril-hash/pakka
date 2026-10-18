/** Square mark (deep-blue tile, cyan check): favicon-sized uses only. */
export function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pakka-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a5cc4" />
          <stop offset="1" stopColor="#003173" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#pakka-tile)" />
      <path d="M9.5 16.5l4.2 4.2L22.5 11.5" fill="none" stroke="#00effe" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The Pakka wordmark: "pakka" with the cyan check. `dark` = on a black surface. */
export function Wordmark({ dark = false, size = 'md' }) {
  const h = { sm: 'h-[22px]', md: 'h-7', lg: 'h-10' }[size];
  return (
    <img
      src={dark ? '/images/pakka-wordmark-light.png' : '/images/pakka-wordmark.png'}
      alt="Pakka"
      className={`${h} w-auto select-none`}
      draggable="false"
    />
  );
}
