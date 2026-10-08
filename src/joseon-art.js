// '조선시대의 나' 장면 — 첫 화면 관상가와 같은 민화풍. 얼굴은 내 측정값(얼굴 길이·코·입)을 조금 따른다.
const INK = '#2b2118';
const SKIN = '#edcfac';

function face(m) {
  const asp = Math.max(1.15, Math.min(1.45, m?.aspect ?? 1.3));
  const h = 46 * asp;
  const nose = Math.max(0.24, Math.min(0.38, m?.noseWidth ?? 0.3)) * 60;
  const mouth = Math.max(0.3, Math.min(0.42, m?.mouthWidth ?? 0.36)) * 50;
  const cy = 190;
  return `
    <path d="M128 ${cy - h * 0.45} C 126 ${cy + h * 0.2} 138 ${cy + h * 0.55} 150 ${cy + h * 0.58} C 162 ${cy + h * 0.55} 174 ${cy + h * 0.2} 172 ${cy - h * 0.45} Z" fill="${SKIN}" stroke-width="2"/>
    <path d="M136 ${cy - 6} q 6 -5 12 -1 M152 ${cy - 7} q 6 -4 12 1" fill="none" stroke-width="2.4"/>
    <path d="M137 ${cy + 3} q 5 -4 10 0 q -5 3 -10 0z M153 ${cy + 3} q 5 -4 10 0 q -5 3 -10 0z" fill="#fbf7ee" stroke-width="1.2"/>
    <circle cx="142" cy="${cy + 2.6}" r="2" fill="${INK}" stroke="none"/><circle cx="158" cy="${cy + 2.6}" r="2" fill="${INK}" stroke="none"/>
    <path d="M150 ${cy + 6} q -2 ${h * 0.18} -${nose / 4} ${h * 0.24} q ${nose / 4} 4 ${nose / 2} 0" fill="none" stroke-width="1.6"/>
    <path d="M${150 - mouth / 2} ${cy + h * 0.38} q ${mouth / 2} 4 ${mouth} 0" fill="none" stroke="#9b3d2e" stroke-width="1.8"/>
    <ellipse cx="136" cy="${cy + h * 0.24}" rx="7" ry="4" fill="#d9826a" opacity="0.35" stroke="none"/>
    <ellipse cx="164" cy="${cy + h * 0.24}" rx="7" ry="4" fill="#d9826a" opacity="0.35" stroke="none"/>`;
}

const HATS = {
  gat: `<path d="M134 168 L 137 132 Q 150 127 163 132 L 166 168 Z" fill="#1f1914" fill-opacity="0.85" stroke-width="1.8"/><ellipse cx="150" cy="168" rx="56" ry="10" fill="#1f1914" fill-opacity="0.55" stroke-width="2"/>`,
  samo: `<path d="M130 170 q 0 -26 20 -28 q 20 2 20 28 z" fill="#1f1914" stroke-width="1.8"/><path d="M128 160 q -22 -6 -30 4 q 10 6 30 2z M172 160 q 22 -6 30 4 q -10 6 -30 2z" fill="#1f1914" stroke-width="1.4"/>`,
  yugeon: `<path d="M130 170 L 134 136 L 150 128 L 166 136 L 170 170 Z" fill="#2b2118" fill-opacity="0.9" stroke-width="1.6"/><path d="M150 128 v 42" stroke="#5a4b3c" stroke-width="1"/>`,
  jeonrip: `<ellipse cx="150" cy="166" rx="44" ry="9" fill="#2b2118" stroke-width="1.8"/><path d="M134 166 q 0 -26 16 -28 q 16 2 16 28" fill="#2b2118" stroke-width="1.8"/><path d="M150 138 q 4 -10 12 -12" stroke="#c8553d" stroke-width="3" fill="none"/>`,
  jjok: `<path d="M126 176 q 0 -36 24 -38 q 24 2 24 38 q -6 -20 -24 -22 q -18 2 -24 22z" fill="#1f1914" stroke-width="1.6"/><path d="M150 140 v 12" stroke="#f6efe0" stroke-width="1.2"/>`,
};

function body(robe, female) {
  if (female) {
    return `<path d="M96 400 C 96 320 116 270 150 266 C 184 270 204 320 204 400 Z" fill="#c8553d" stroke-width="2.2"/>
      <path d="M118 262 C 120 290 180 290 182 262 L 176 246 C 160 252 140 252 124 246 Z" fill="${robe}" stroke-width="2"/>
      <path d="M150 252 l -10 26 M150 252 l 10 26" stroke="#b23a2e" stroke-width="3"/>`;
  }
  return `<path d="M88 400 C 88 320 108 270 150 264 C 192 270 212 320 212 400 Z" fill="${robe}" stroke-width="2.2"/>
    <path d="M150 264 L 132 330 M150 264 L 168 330" fill="none" stroke="#2f4a7a" stroke-width="5"/>`;
}

const SCENES = {
  // 의녀: 약재 서랍장, 약사발, 약초 바구니
  clinic: `
    <rect x="200" y="70" width="80" height="150" fill="#7a5235" stroke-width="2"/>
    <g fill="#a9825a" stroke-width="1.2">${[0, 1, 2, 3, 4].map((r) => [0, 1].map((c) => `<rect x="${206 + c * 38}" y="${78 + r * 28}" width="32" height="22"/><circle cx="${222 + c * 38}" cy="${89 + r * 28}" r="2" fill="#2b2118"/>`).join('')).join('')}</g>
    <ellipse cx="70" cy="330" rx="40" ry="12" fill="#a9825a" stroke-width="2"/><path d="M40 326 q 10 -20 20 -6 q 10 -18 20 -4 q 10 -16 22 2" fill="none" stroke="#3f6e57" stroke-width="2"/>
    <path d="M200 320 q 20 18 40 0 q -2 16 -20 18 q -18 -2 -20 -18z" fill="#e8e1d0" stroke-width="1.6"/>`,
  // 객주: 객줏집 처마, 저울, 엽전 꾸러미, 비단 두루마리, 짐 진 보부상
  market: `
    <path d="M10 120 L 150 70 L 290 120 Z" fill="#5b3a24" stroke-width="2"/><path d="M20 120 h 260" stroke-width="3"/>
    <rect x="30" y="120" width="10" height="160" fill="#7a5235"/><rect x="260" y="120" width="10" height="160" fill="#7a5235"/>
    <rect x="200" y="132" width="44" height="24" fill="#f6efe0" stroke-width="1.4"/><text x="222" y="149" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="13" font-weight="700" fill="#b23a2e" stroke="none">客主</text>
    <path d="M40 300 h 70 v 40 h -70z" fill="#a9825a" stroke-width="2"/>
    <g fill="#c8a35a" stroke="#5b3a24" stroke-width="1"><circle cx="54" cy="296" r="6"/><circle cx="66" cy="292" r="6"/><circle cx="78" cy="296" r="6"/><circle cx="90" cy="292" r="6"/></g>
    <rect x="198" y="290" width="70" height="16" rx="8" fill="#c8553d" stroke-width="1.6"/><rect x="206" y="308" width="60" height="16" rx="8" fill="#3f6e57" stroke-width="1.6"/><rect x="200" y="326" width="70" height="16" rx="8" fill="#2f4a7a" stroke-width="1.6"/>
    <path d="M232 200 v 60 M210 210 h 44 M210 210 l -8 22 h 16 z M254 210 l -8 22 h 16 z" fill="#d8c9a3" stroke-width="1.6"/>
    <g opacity="0.55"><circle cx="66" cy="200" r="8" fill="#5b3a24"/><path d="M66 208 v 30 M66 214 l -10 14 M66 214 l 10 14 M66 238 l -8 18 M66 238 l 8 18" stroke-width="2"/><rect x="72" y="196" width="18" height="30" fill="#a9825a" stroke-width="1.2"/></g>`,
  // 문관·상궁: 관청 기둥, 서안, 두루마리 문서
  office: `
    <rect x="20" y="40" width="16" height="300" fill="#b23a2e"/><rect x="264" y="40" width="16" height="300" fill="#b23a2e"/>
    <path d="M0 40 h 300 v 22 h -300z" fill="#3f6e57" stroke-width="2"/><path d="M0 62 h 300" stroke="#c8a35a" stroke-width="4"/>
    <rect x="60" y="320" width="180" height="16" fill="#5b3a24" stroke-width="2"/><path d="M70 336 v 40 M230 336 v 40" stroke-width="5" stroke="#5b3a24"/>
    <rect x="200" y="296" width="36" height="24" fill="#f6efe0" stroke-width="1.4"/><path d="M206 304 h 24 M206 312 h 18" stroke-width="1"/>
    <rect x="70" y="300" width="50" height="10" rx="5" fill="#f6efe0" stroke-width="1.4"/>`,
  // 선비·문인: 책더미, 서안, 매화 가지
  study: `
    <path d="M300 60 C 240 80 220 120 200 160" stroke="#5b3a24" stroke-width="5" fill="none"/>
    <g fill="#f4d6dc" stroke="#c8553d" stroke-width="0.8"><circle cx="252" cy="78" r="6"/><circle cx="232" cy="104" r="6"/><circle cx="214" cy="134" r="5"/><circle cx="270" cy="70" r="5"/></g>
    <rect x="50" y="320" width="200" height="14" fill="#5b3a24" stroke-width="2"/>
    <g stroke-width="1.4"><rect x="60" y="290" width="54" height="10" fill="#2f4a7a"/><rect x="64" y="280" width="50" height="10" fill="#c8a35a"/><rect x="58" y="300" width="58" height="10" fill="#3f6e57"/><rect x="62" y="310" width="52" height="10" fill="#b23a2e"/></g>
    <path d="M200 300 l 30 -30" stroke-width="2"/><ellipse cx="226" cy="312" rx="16" ry="6" fill="#2b2118" opacity="0.8"/>`,
  // 화원·침선장: 펼친 화첩(산수), 물감 접시, 붓
  studio: `
    <rect x="40" y="290" width="120" height="70" fill="#f6efe0" stroke-width="2"/><path d="M50 340 l 22 -30 l 16 18 l 20 -26 l 40 38" fill="none" stroke="#3f6e57" stroke-width="2"/>
    <circle cx="214" cy="320" r="12" fill="#c8553d" stroke-width="1.2"/><circle cx="244" cy="324" r="12" fill="#2f4a7a" stroke-width="1.2"/><circle cx="230" cy="348" r="12" fill="#c8a35a" stroke-width="1.2"/>
    <path d="M196 280 l 40 -60" stroke-width="3" stroke="#5b3a24"/><path d="M236 220 l 6 -10" stroke-width="5"/>
    <path d="M20 90 q 40 -30 80 0 q 40 30 80 0" fill="none" stroke="#3f6e57" stroke-width="2" opacity="0.6"/>`,
  // 무관·의녀: 깃발, 활, 과녁(의녀는 약재 바구니로 같은 자리)
  field: `
    <path d="M40 360 V 60" stroke="#5b3a24" stroke-width="4"/><path d="M40 60 l 70 16 l -70 20 z" fill="#c8553d" stroke-width="1.8"/>
    <circle cx="246" cy="150" r="26" fill="#f6efe0" stroke-width="2"/><circle cx="246" cy="150" r="16" fill="#2f4a7a" stroke="none"/><circle cx="246" cy="150" r="6" fill="#c8553d" stroke="none"/>
    <path d="M220 330 q -30 -50 0 -100" fill="none" stroke="#5b3a24" stroke-width="3"/><path d="M220 230 v 100" stroke-width="1"/>`,
};

/** @returns {string} SVG */
export function joseonScene(role, metrics, gender) {
  const female = gender === 'f';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" role="img" aria-label="조선시대의 나: ${role.title}">
  <defs><filter id="jp"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45 0 0 0 0 0.33 0 0 0 0 0.2 0 0 0 0.09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="ji"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.4"/></filter></defs>
  <rect width="300" height="400" fill="#efe2c6"/><rect width="300" height="400" fill="#efe2c6" filter="url(#jp)"/>
  <g filter="url(#ji)" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
    ${SCENES[role.scene] ?? ''}
    ${body(role.robe, female)}
    <path d="M140 246 v 22 h 20 v -22" fill="${SKIN}" stroke-width="1.6"/>
    ${face(metrics)}
    ${HATS[female ? 'jjok' : role.hat] ?? ''}
    <rect x="252" y="356" width="34" height="34" rx="3" fill="#b23a2e" stroke="none"/>
    <text x="269" y="371" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="11" fill="#f6efe0" stroke="none" font-weight="700">朝鮮</text>
    <text x="269" y="384" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="11" fill="#f6efe0" stroke="none" font-weight="700">之我</text>
  </g></svg>`;
}
