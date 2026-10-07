// 서버·결제 연결값. 모두 '공개돼도 되는' 값이다(비밀 키는 Supabase 함수의 Secrets 에만).
// 빌드 때 환경 변수(GitHub 저장소 Variables)로 넣는다. docs/결제-연결.md
export const SUPABASE = {
  url: import.meta.env?.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
};
export const COLLECT_ON = !!(SUPABASE.url && SUPABASE.anonKey);
// 토스페이먼츠 결제위젯 클라이언트 키 (test_gck_… 로 시작하면 테스트 결제 — 실제 돈이 나가지 않음)
export const TOSS_CLIENT_KEY = import.meta.env?.VITE_TOSS_CLIENT_KEY || '';
// 지금은 테스트 기간: 결제 없이 무료로 쓴다.
//  · SERVER_ON: Supabase 가 연결되면 서버에서 AI 해설을 만들어 저장(서버 FREE_MODE=true 면 결제 건너뜀)
//  · 연결 전: 기기 안에서 원문 풀이로 해설 칸을 채운다
// 나중에 결제를 붙이면 VITE_TOSS_CLIENT_KEY 를 넣고 서버 FREE_MODE 를 false 로.
export const SERVER_ON = !!SUPABASE.url;
export const PAID_ON = !!(SUPABASE.url && TOSS_CLIENT_KEY);
