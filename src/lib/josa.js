// 한국어 조사 자동 선택: josa('수아', '이/가') → '수아가'
export function josa(word, pair) {
  const [withFinal, without] = pair.split('/');
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}${withFinal}(${without})`;
  return word + (code % 28 ? withFinal : without);
}
