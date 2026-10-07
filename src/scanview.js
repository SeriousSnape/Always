// 카메라 위에 그리는 것: 얼굴을 따라다니는 기준선(미술 시간 얼굴 그리기 십자선)과 틀 안 확인
import { GUIDE } from './lib/scan.js';

/** 얼굴 점 위에 기준선을 그린다 (캔버스는 영상과 같은 크기) */
export function drawGuide(c, lm, w, h) {
  const ctx = c.getContext('2d');
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  // 점들을 지나는 부드러운 곡선(Catmull-Rom → 베지어)
  const line = (ids, color, width, dash = []) => {
    const pts = ids.map((i) => [lm[i].x * w, lm[i].y * h]);
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1],
      );
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.stroke();
  };
  const u = Math.max(1.5, w / 360);
  line(GUIDE.oval, 'rgba(255,255,255,0.55)', u);
  line(GUIDE.mid, 'rgba(244,201,93,0.95)', u * 1.6);
  line(GUIDE.eyes, 'rgba(244,201,93,0.95)', u * 1.6);
  line(GUIDE.brows, 'rgba(255,255,255,0.6)', u, [u * 3, u * 3]);
  line(GUIDE.noseBase, 'rgba(255,255,255,0.6)', u, [u * 3, u * 3]);
  line(GUIDE.mouth, 'rgba(255,255,255,0.6)', u, [u * 3, u * 3]);
  // 십자 교차점(미간)
  const c9 = lm[168];
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(c9.x * w, c9.y * h, u * 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(244,201,93,1)';
  ctx.fill();
}

/**
 * 얼굴(이마 위~턱 끝, 양 볼)이 화면의 타원 틀 안에 들어왔는지.
 * 영상은 object-fit: cover 로 잘려 보이므로 화면 좌표로 바꿔서 본다.
 */
export function inFrame(lm, video, stage) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  const k = Math.max(sw / vw, sh / vh);
  const ox = (sw - vw * k) / 2;
  const oy = (sh - vh * k) / 2;
  const pt = (i) => ({ x: (lm[i].x * vw * k + ox) / sw, y: (lm[i].y * vh * k + oy) / sh });
  const cx = 0.5;
  const cy = 0.5;
  const rx = 0.34;
  const ry = 0.4;
  const inside = (p) => ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 <= 1;
  const top = pt(10);
  const chin = pt(152);
  const l = pt(234);
  const r = pt(454);
  const allIn = [top, chin, l, r].every(inside);
  const big = chin.y - top.y > ry * 2 * 0.5; // 너무 멀면 안 됨
  return { ok: allIn && big, far: allIn && !big, pts: { top, chin, l, r } };
}

/** 영상 한 장면에서 얼굴 부분만 잘라 작은 사진으로 */
export function thumb(source, lm, w, h) {
  const xs = [234, 454, 10, 152].map((i) => lm[i].x * w);
  const ys = [234, 454, 10, 152].map((i) => lm[i].y * h);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.12;
  const bh = y1 - y0 + pad * 2;
  const bw = (bh * 3) / 4;
  const cx = (x0 + x1) / 2;
  const t = document.createElement('canvas');
  t.width = 90;
  t.height = 120;
  t.getContext('2d').drawImage(source, cx - bw / 2, y0 - pad, bw, bh, 0, 0, 90, 120);
  return t.toDataURL('image/jpeg', 0.7);
}
