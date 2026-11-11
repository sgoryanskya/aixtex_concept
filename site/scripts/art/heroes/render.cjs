/* Сборка кадров первого экрана для палитр раунда 5.
   node site/scripts/art/heroes/render.cjs <out-dir> [olive,ultra,steel,mint]
   Пишет <out-dir>/hero-<id>.png (4000×2250, дальше уменьшается до 2000×1125 в webp)
   и пути импульсов в site/src/data/hero-paths.json */
const fs = require('fs');
const path = require('path');
const site = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(site, 'node_modules/playwright-core'));

const out = path.resolve(process.argv[2] || '/tmp/heroes');
const ids = (process.argv[3] || 'olive,ultra,steel,mint').split(',');
const PAL = {
  olive: { bg: '#13160E', dark: '#2E3016', base: '#8F9146', light: '#D8D69C', hi: '#F8F7E3', accent: '#BAC46A', second: '#D8C59C' },
  ultra: { bg: '#04050C', dark: '#0A1250', base: '#2F4BE8', light: '#A9B8FF', hi: '#F0F3FF', accent: '#5B78FF', second: '#C9D3F5' },
  steel: { bg: '#080B0D', dark: '#16242C', base: '#5E8597', light: '#C9DDE5', hi: '#F4FAFC', accent: '#9FC3D3', second: '#E0D2C0' },
  mint: { bg: '#050A0A', dark: '#053329', base: '#19A486', light: '#93EBD3', hi: '#EAFCF6', accent: '#3FD9B4', second: '#E2D3B5' },
  /* часть 9: градиент Nexora и Signale — оранжевый, белый, синий на чёрном */
  grad: { bg: '#040406', deep2: '#7A1404', warm: '#FF4A14', coral: '#FF8E6E', hi: '#FFF3EC', light: '#9DB4FF', base: '#3058FF', dark: '#0A1678' },
  /* часть 9: оранжевый перелив — лава, янтарь, розовый и сирень на тёплом чёрном */
  iris: { bg: '#0A0605', deep: '#5C0B02', base: '#FF5E1A', amber: '#FFB25E', rose: '#FF6E8E', violet: '#8C6BFF', peri: '#AFC0FF', hi: '#FFF4EA' },
};
const W = 4000;
const H = 2250;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const pathsFile = path.join(site, 'src/data/hero-paths.json');
  const paths = fs.existsSync(pathsFile) ? JSON.parse(fs.readFileSync(pathsFile, 'utf8')) : {};
  for (const id of ids) {
    const p = await (await b.newContext({ viewport: { width: 800, height: 450 } })).newPage();
    p.on('pageerror', (e) => console.error(id, e.message));
    p.on('console', (m) => m.type() === 'error' && console.error(id, m.text()));
    await p.setContent('<!doctype html><body style="margin:0;background:#000"></body>');
    await p.addScriptTag({ path: path.join(__dirname, 'lib.js') });
    await p.addScriptTag({ path: path.join(__dirname, `${id}.js`) });
    const t = Date.now();
    const res = await p.evaluate(async ([W, H, pal]) => {
      const r = await window.render(W, H, pal);
      return { png: r.canvas.toDataURL('image/png'), paths: r.paths };
    }, [W, H, PAL[id]]);
    fs.writeFileSync(path.join(out, `hero-${id}.png`), Buffer.from(res.png.split(',')[1], 'base64'));
    paths[id] = res.paths;
    console.log(id, `${((Date.now() - t) / 1000).toFixed(1)} s`, `${res.paths.lines.length} путей`);
    await p.close();
  }
  fs.writeFileSync(pathsFile, JSON.stringify(paths) + '\n');
  await b.close();
})();
