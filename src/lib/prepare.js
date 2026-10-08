// 한 사람의 측정값 → 유료 결과에 필요한 모든 판정 + AI 재료(brief). 기기 안에서만 돈다.
import { readFace, yearlyFlow } from './reading.js';
import { buildBrief } from './narrative.js';
import { formsOf, badFormsOf } from './forms.js';
import { readComplexion } from './complexion.js';
import { joseonSelf } from './joseon.js';

/**
 * @param {{name?:string, birthYear:number|null, gender:'m'|'f'|null, worry?:string, thisYear:number,
 *          metrics:object, forehead:object|null, complexion?:object|null}} p
 */
export function prepare(p) {
  const opts = { forehead: p.forehead, gender: p.gender };
  const reading = readFace(p.metrics, opts);
  const yearly = p.birthYear ? yearlyFlow(p.metrics, p.birthYear, opts, p.thisYear) : [];
  const forms = formsOf(p.metrics, reading.results);
  const lead = { ...forms.lead.best, organName: forms.lead.name };
  const complexion = p.complexion ? readComplexion(p.complexion, { month: new Date().getMonth() + 1 }) : null;
  const badForms = badFormsOf(p.metrics);
  const joseon = joseonSelf({ date: p.birthDate ?? null, time: p.birthTime ?? null }, reading.results, { organ: forms.lead.organ, name: lead.name }, p.gender);
  const brief = buildBrief(
    reading,
    yearly,
    { name: p.name || null, birthYear: p.birthYear ?? p.thisYear, gender: p.gender, worry: p.worry, thisYear: p.thisYear },
    {
      complexion,
      badForms,
      joseon,
      eye: { ...lead, name: `${lead.organName} · ${lead.name}`, shape: lead.says, verse: lead.says, verseKo: lead.reading, shapeKo: lead.shapeKo, traits: [] },
    },
  );
  if (!p.birthYear) brief.sections = brief.sections.filter((s) => s.key !== 'olhae');
  return { reading, yearly, forms, lead, complexion, badForms, brief, joseon };
}
