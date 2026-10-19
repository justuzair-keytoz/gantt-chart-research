// Tiny inline × glyph — avoids pulling in an icon package for one symbol.
export function IconX() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
