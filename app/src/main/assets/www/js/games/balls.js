// Мʼячики. Белый фон, вид сверху. Наклони телефон — мячики катятся, стукаются друг о друга и о края.
// У каждого свой характер: размер, прыгучесть, звук удара. Тап — подпрыгивает; можно взять пальцем и бросить.
import { TiltWorld, rnd } from './tiltWorld.js';
import { drawBall, BALL_PHYS } from '../art/balls.js';
import { haptic } from '../core/haptics.js';
import * as S from '../sounds/balls.js';

const SET = ['beach', 'basket', 'soccer', 'tennis', 'bell', 'fluffy', 'star', 'tennis', 'star'];

export default class BallsGame extends TiltWorld {
  static erasable = false;
  static background = '#FFFFFF';
  static volume = 1;

  constructor(stage) {
    super(stage, { accel: 5 });
    for (const kind of SET) {
      const ph = BALL_PHYS[kind];
      const size = this.u * 0.24 * ph.size;
      const r = size * 0.4;
      const at = this.freeSpot(r);
      this.addThing({ kind, size, r, rot: rnd(0, 6) }, at.x, at.y, {
        restitution: ph.bounce, friction: ph.friction,
        frictionAir: kind === 'fluffy' ? 0.05 : kind === 'beach' ? 0.02 : 0.012,
        density: 0.001 * ph.density,
      });
    }
  }

  afterUpdate(dt) {
    // узор крутится, когда мяч катится
    for (const t of this.things) {
      const v = this.vel(t);
      const s = Math.hypot(v.x, v.y);
      if (s < 1) continue;
      const sign = Math.abs(v.x) >= Math.abs(v.y) ? Math.sign(v.x) : Math.sign(v.y);
      t.rot += (sign * s * dt) / t.r;
    }
  }

  onHit(t, k, other) {
    // в паре мяч-мяч звучит каждый по-своему, но потише
    S.hit(t.kind, other ? k * 0.75 : k, this.pan(t.body.position.x));
    if (k > 0.45) haptic(k > 0.85 ? 1 : 0);
  }

  onTap(t) { S.hop(t.kind, this.pan(t.body.position.x)); haptic(0); }
  onThrow(t, k) { S.whoosh(k, this.pan(t.body.position.x)); }
  onLand(t, k) { S.hit(t.kind, 0.25 + k * 0.4, this.pan(t.body.position.x)); }
  onEmpty(x) { S.puff(this.pan(x)); haptic(0); }
  onShake(k) { S.rattle(k); haptic(1); }

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // волна от тапа мимо
    for (const r of this.rings) {
      const k = r.t / r.max;
      ctx.strokeStyle = `rgba(120,150,200,${0.35 * (1 - k)})`;
      ctx.lineWidth = this.u * 0.012 * (1 - k * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, this.u * (0.05 + k * 0.4), 0, Math.PI * 2); ctx.stroke();
    }

    // сначала те, что на полу, сверху — подпрыгнувшие
    const list = [...this.things].sort((a, b) => a.z - b.z || a.body.position.y - b.body.position.y);
    for (const t of list) {
      const p = t.body.position;
      drawBall(ctx, t.kind, p.x, p.y, t.size, { rot: t.rot, squash: t.squash, dir: t.dir, lift: Math.min(1, t.z * 1.6) });
    }
  }
}
