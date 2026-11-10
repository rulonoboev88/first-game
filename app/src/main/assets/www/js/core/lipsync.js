// Рот в такт звуку: по уровню громкости голоса считаем, насколько открыт рот (0..1).
// Быстро открывается на громком, плавно закрывается в паузах.

export function mouthFrom(voice, prev, dt) {
  const fall = prev * Math.exp(-dt * 12);
  if (!voice) return fall < 0.01 ? 0 : fall;
  const l = voice.level();
  voice.peak = Math.max(voice.peak || 0.02, l);
  let t = l / voice.peak * 1.15;
  if (t < 0.14) t = 0;
  return Math.max(Math.min(1, t), fall);
}

