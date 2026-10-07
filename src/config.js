// 서버·결제 연결값. 모두 '공개돼도 되는' 값이다(비밀 키는 Supabase 함수의 Secrets 에만).
// 빌드 때 환경 변수(GitHub 저장소 Variables)로 넣는다. docs/결제-연결.md
export const SUPABASE = {
  url: import.meta.env?.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
};
export const COLLECT_ON = !!(SUPABASE.url && SUPABASE.anonKey);
// 토스페이먼츠 결제위젯 클라이언트 키 (test_gck_… 로 시작하면 테스트 결제 — 실제 돈이 나가지 않음)
export const TOSS_CLIENT_KEY = import.meta.env?.VITE_TOSS_CLIENT_KEY || '';
// 서버와 결제가 모두 연결돼야 실제 결제. 아니면 '결제 전 보기'(데모)로 동작
export const PAID_ON = !!(SUPABASE.url && TOSS_CLIENT_KEY);
