/** A small, original vector rendering of Bayern's red 2026/27 home shirt. */
export default function BayernKit() {
  const shirt = 'M24 0 36 4 43 9 57 9 64 4 76 0 100 19 87 43 76 36 76 100 24 100 24 36 13 43 0 19Z';

  return (
    <svg className="bayern-kit" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="bayern-shirt-clip"><path d={shirt} /></clipPath>
        <pattern id="bayern-tonal-stripes" width="7" height="100" patternUnits="userSpaceOnUse">
          <rect width="7" height="100" fill="#c80c2e" />
          <path d="M1 0V100" stroke="#a90025" strokeWidth="1" opacity=".35" />
          <path d="M4 0V100" stroke="#e5203d" strokeWidth=".7" opacity=".35" />
        </pattern>
      </defs>

      <path d={shirt} fill="url(#bayern-tonal-stripes)" />
      <g clipPath="url(#bayern-shirt-clip)" fill="none" stroke="#fff" strokeLinecap="round">
        <path d="M24 3 5 19 M28 5 8 22 M32 7 11 25" strokeWidth="1.35" />
        <path d="M76 3 95 19 M72 5 92 22 M68 7 89 25" strokeWidth="1.35" />
        <path d="M1 21 13 41 M99 21 87 41" strokeWidth="1.8" />
      </g>
      <path d="M39 9 Q50 19 61 9" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M39 11 Q50 21 61 11" fill="none" stroke="#d6ad59" strokeWidth=".8" />
      <path d="M42 10 Q50 16 58 10" fill="none" stroke="#a90025" strokeWidth="1.5" />

      <g fill="#fff">
        <path d="M39 48H61V53H53V65H47V53H39Z" />
        <rect x="33" y="55" width="4" height="4" rx=".4" />
        <rect x="63" y="55" width="4" height="4" rx=".4" />
      </g>
    </svg>
  );
}
