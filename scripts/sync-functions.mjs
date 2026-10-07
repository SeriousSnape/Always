// 서버 함수가 브라우저와 똑같은 해설 규칙·검사를 쓰도록 src/lib/narrative.js 를 복사한다.
import { copyFileSync } from 'node:fs';
copyFileSync('src/lib/narrative.js', 'supabase/functions/_shared/narrative.js');
