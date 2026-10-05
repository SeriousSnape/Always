// 보정용 측정값을 받는 구글 Apps Script 웹 앱 주소 (docs/데이터-수집.md).
// 비어 있으면 '측정값 기여하기' 카드를 숨긴다. 빌드 때 VITE_COLLECT_URL 로도 넣을 수 있다.
export const COLLECT_URL = import.meta.env?.VITE_COLLECT_URL || '';
