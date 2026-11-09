# Звуки паровозика из записей BigSoundBank (CC0) → sounds/train/*.ogg + manifest.json
#   python3 tools/sound/train_sounds.py <папка с wav> <папка www/sounds/train>
# «Чух»: настоящие выхлопы из проезда паровоза (s3009, 13.0–15.9 с), по началу каждого удара.
# Гудки: настоящий гудок из того же проезда (15.88–17.7 с, собран в «ту-тууу») и два ручных свистка (s3321, s3316).
# Для гудков ищем петлю в стоячей части (целое число периодов, переход по нулю) — в игре гудок тянется, пока палец держит.
import sys, glob, json, subprocess, os
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
SR = 44100
os.makedirs(OUT, exist_ok=True)

def load(key, a=None, b=None):
    f = [x for x in glob.glob(os.path.join(SRC, '*.wav')) if key in x][0]
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).copy()
    return x[int(a * SR):int(b * SR)] if a is not None else x

def save(x, name):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', '5', os.path.join(OUT, name + '.ogg')], input=x.astype(np.float32).tobytes(), check=True)

def fade(x, fi=0.003, fo=0.04):
    x = x.copy(); a, b = int(fi * SR), int(fo * SR)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b) ** 2
    return x

# высокочастотный срез гула (<70 Гц) — дешёвый динамики телефона всё равно его не играют, а запас громкости съедает
def hp(x, f=70):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X[fr < f] *= (fr[fr < f] / f) ** 2
    return np.fft.irfft(X, len(x))

# ---------- «чух» ----------
seg = hp(load('passage', 13.0, 15.9))
hop, N = 220, 1024
win = np.hanning(N); flux = []; prev = None
for i in range(len(seg) // hop):
    fr = seg[i * hop:i * hop + N]
    if len(fr) < N: break
    S = np.abs(np.fft.rfft(fr * win))[int(1000 / SR * N):int(6000 / SR * N)]
    flux.append(0 if prev is None else np.maximum(0, np.log(S + 1e-6) - np.log(prev + 1e-6)).sum()); prev = S
flux = np.array(flux); flux = (flux - flux.mean()) / flux.std()
on = []
for i in range(1, len(flux) - 1):
    if flux[i] > 1.0 and flux[i] == flux[max(0, i - 12):i + 12].max() and (not on or (i - on[-1]) * hop / SR > 0.12): on.append(i)
t = np.array(on) * hop / SR
names = []
for k in range(len(t) - 1):
    if t[k + 1] - t[k] > 0.23: continue  # пропущенный удар — в куске два «чух»
    c = fade(seg[int((t[k] - 0.006) * SR):int((t[k + 1] - 0.006) * SR)])
    c = c / (np.sqrt((c ** 2).mean()) + 1e-9) * 0.12
    names.append(f'chuff_{len(names) + 1}'); save(c, names[-1])

# ---------- гудки ----------
def best_loop(x, a, b, f0):
    """Петля внутри [a,b] с длиной ≈ целому числу периодов и переходом через ноль вверх; минимум разрыва."""
    per = SR / f0
    n = max(1, int(round(0.32 * SR / per)))
    L = int(round(n * per))
    s0 = int(a * SR)
    zc = [i for i in range(s0, int(b * SR) - L - 1) if x[i] <= 0 < x[i + 1]]
    best, bi = 1e9, None
    for i in zc[::2]:
        j = i + L
        cand = [k for k in range(j - 6, j + 7) if x[k] <= 0 < x[k + 1]]
        for k in cand:
            err = np.sum((x[i:i + 64] - x[k:k + 64]) ** 2)
            if err < best: best, bi = err, (i, k)
    return bi[0] / SR, bi[1] / SR

def f0_of(x, a, b, lo=400, hi=1600):
    s = x[int(a * SR):int(b * SR)]; S = np.abs(np.fft.rfft(s * np.hanning(len(s)))); fr = np.fft.rfftfreq(len(s), 1 / SR)
    m = (fr > lo) & (fr < hi); return fr[m][np.argmax(S[m])]

wh = []
# 1. настоящий: короткое «ту» из начала гудка, пауза, потом весь гудок
blast = hp(load('passage', 15.88, 17.7)); blast = fade(blast, 0.004, 0.08)
short = fade(blast[:int(0.22 * SR)], 0.004, 0.04)
real = np.concatenate([short, np.zeros(int(0.1 * SR)), blast])
off = 0.22 + 0.1
wh.append(('whistle_1', real, off + 0.35, off + 1.25))
# 2–3. ручные свистки (с естественным эхом в хвосте)
wh.append(('whistle_2', fade(hp(load('whistle_foley_7', 0.05, 3.3)), 0.002, 0.3), 0.75, 1.40))
wh.append(('whistle_3', fade(hp(load('whistle_foley_2', 0.05, 3.0)), 0.002, 0.3), 0.55, 1.45))
meta = {}
for name, x, a, b in wh:
    x = x / np.abs(x).max() * 0.7
    f0 = f0_of(x, a, b)
    ls, le = best_loop(x, a, b, f0)
    save(x, name)
    meta[name] = {'loopStart': round(ls, 5), 'loopEnd': round(le, 5), 'f0': round(float(f0), 1)}
json.dump({'chuff': names, 'whistle': meta}, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
print(len(names), 'chuffs;', meta)
