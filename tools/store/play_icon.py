# Иконка 512×512 для Google Play из иконки приложения (adaptive icon: фон ic_bg + векторный передний план).
#   python3 tools/store/play_icon.py <out.png>
# Видимая часть adaptive-иконки — центральные 72 из 108 dp; её и растягиваем на 512 (углы Play скругляет сам).
import re, sys, subprocess, os, tempfile
root = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'src', 'main', 'res')
bg = re.search(r'name="ic_bg">(#[0-9A-Fa-f]{6})', open(os.path.join(root, 'values', 'colors.xml')).read()).group(1)
xml = open(os.path.join(root, 'drawable', 'ic_launcher_foreground.xml')).read()
g = re.search(r'<group([^>]*)>', xml).group(1)
attr = lambda s, k, d=None: (re.search(rf'android:{k}="([^"]+)"', s) or [None, d])[1]
tx, ty, sx, sy = (float(attr(g, k, v)) for k, v in [('translateX', 0), ('translateY', 0), ('scaleX', 1), ('scaleY', 1)])
paths = []
for p in re.findall(r'<path([^>]*)/>', xml):
    d = attr(p, 'pathData'); fill = attr(p, 'fillColor', 'none'); stroke = attr(p, 'strokeColor', 'none')
    paths.append(f'<path d="{d}" fill="{fill}" fill-opacity="{attr(p, "fillAlpha", "1")}" stroke="{stroke}" '
                 f'stroke-width="{attr(p, "strokeWidth", "0")}" stroke-linecap="{attr(p, "strokeLineCap", "butt")}" '
                 f'stroke-linejoin="{attr(p, "strokeLineJoin", "miter")}"/>')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="18 18 72 72">'
       f'<rect x="0" y="0" width="108" height="108" fill="{bg}"/>'
       f'<g transform="translate({tx} {ty}) scale({sx} {sy})">{"".join(paths)}</g></svg>')
tmp = tempfile.mkdtemp()
open(os.path.join(tmp, 'icon.svg'), 'w').write(svg)
js = f"""const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch(); const pg = await b.newPage({{ viewport: {{ width: 512, height: 512 }} }});
await pg.goto('file://{tmp}/icon.svg'); await pg.screenshot({{ path: '{os.path.abspath(sys.argv[1])}' }}); await b.close(); }})();"""
open(os.path.join(tmp, 'r.js'), 'w').write(js)
subprocess.run(['node', os.path.join(tmp, 'r.js')], check=True)
print('ok', sys.argv[1])
