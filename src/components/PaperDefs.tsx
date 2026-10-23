// Sitedeki kağıt efektlerinin ortak SVG filtreleri. Layout'ta bir kez çizilir,
// CSS'ten `filter: url(#lc-torn)` gibi, SVG'lerden `filter="url(#lc-wobble)"` gibi kullanılır.
//
// lc-torn   → yırtık kâğıt kenarı (kartlar, notlar)
// lc-wobble → elle çizilmiş gibi titrek mürekkep çizgisi
// lc-grain  → kâğıt lifi dokusu (SVG dolgularına)
// lc-shadow → kâğıt parçasının altındaki yumuşak gölge

export default function PaperDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="lc-torn" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="lc-wobble" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="lc-shadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="1.2" dy="2.2" stdDeviation="1.4" floodColor="#26232c" floodOpacity="0.22" />
        </filter>
        <filter id="lc-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0.16 0"
            result="speck"
          />
          <feComposite in="speck" in2="SourceGraphic" operator="in" result="speckIn" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="speckIn" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
