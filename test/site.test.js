import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const htmlFiles = ['docs/index.html', 'docs/about.html', 'docs/changelog.html'];
const pkg = JSON.parse(read('package.json'));

test('Vercel serves only the static docs directory', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, 'docs');
  assert.ok(fs.existsSync(path.join(root, config.outputDirectory, 'index.html')));
});

test('all HTML pages are product-branded and have a local favicon', () => {
  for (const file of htmlFiles) {
    const html = read(file);
    assert.match(html, /<title>[^<]*CLAUDE BOSS[^<]*<\/title>/);
    assert.match(html, /rel="icon" href="\.\/favicon\.svg"/);
    assert.match(html, /rel="stylesheet" href="\.\/site\.css"/);
    assert.match(html, /<main\b[^>]*id="main"/);
    assert.doesNotMatch(html, /Abhijay Panwar['’]s Claude BOSS/i);
  }
});

test('all same-directory asset and navigation links resolve', () => {
  for (const file of htmlFiles) {
    const html = read(file);
    for (const match of html.matchAll(/(?:href|src)="(\.\/[^"#?]+)(?:#[^"]*)?"/g)) {
      assert.ok(fs.existsSync(path.join(root, 'docs', match[1].slice(2))), `${file}: missing ${match[1]}`);
    }
  }
});

test('creator credit does not replace the product name', () => {
  const homepage = read('docs/index.html');
  assert.match(homepage, /<h1[^>]*>CLAUDE <span>BOSS\.<\/span><\/h1>/);
  assert.match(homepage, /Built by <strong>Abhijay Panwar<\/strong>/);
  assert.doesNotMatch(homepage, /Abhijay Panwar['’]s Claude/i);
  assert.match(homepage, /hero-byline[^>]*>[\\s\\S]*Built by Abhijay Panwar/);
  assert.equal(pkg.name, 'claude-boss');
  assert.equal(pkg.author, 'Abhijay Panwar');
});

test('installation and CLI features match the published package version', () => {
  const homepage = read('docs/index.html');
  assert.ok(homepage.includes(`releases/download/v${pkg.version}/claude-boss-${pkg.version}.tgz`));
  for (const command of ['setup balanced','audit','route','sessions','progress','restore']) {
    assert.ok(homepage.includes(command), `missing CLI feature ${command}`);
  }
});

test('SVG brand assets use the CB monogram and correct creator credit', () => {
  const icon = read('docs/favicon.svg');
  const banner = read('docs/brand-banner.svg');
  assert.match(icon, /<svg\b/);
  assert.match(banner, /CLAUDE/);
  assert.match(banner, /BOSS/);
  assert.match(banner, /ABHIJAY PANWAR/);
  assert.doesNotMatch(icon + banner, /\\bAndre\\b/i);
  assert.match(icon, /#f8c755/);
});
