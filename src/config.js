// 보정용 측정값을 받는 Supabase (docs/데이터-수집.md).
// 둘 중 하나라도 비어 있으면 '측정값 기여하기' 카드를 숨긴다. 빌드 때 환경 변수로 넣는다.
export const SUPABASE = {
  url: import.meta.env?.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
};
export const COLLECT_ON = !!(SUPABASE.url && SUPABASE.anonKey);
