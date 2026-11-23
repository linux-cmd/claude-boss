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
  assert.match(homepage, /class="hero-byline"/);
  assert.match(homepage, /Built by Abhijay Panwar/);
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

test('tab titles prioritize the product and clearly identify each page', () => {
  const expected = {
    'docs/index.html': 'CLAUDE BOSS | Claude Code Toolkit',
    'docs/about.html': 'About | CLAUDE BOSS',
    'docs/changelog.html': 'Changelog | CLAUDE BOSS',
  };
  for (const [file, title] of Object.entries(expected)) {
    const html = read(file);
    assert.ok(html.includes(`<title>${title}</title>`), `${file}: unexpected browser-tab title`);
    assert.ok(html.includes(`property="og:title" content="${title}"`), `${file}: Open Graph title differs`);
    assert.ok(html.includes('property="og:site_name" content="CLAUDE BOSS"'), `${file}: missing site brand`);
    assert.ok(!title.includes('—'), `${file}: title uses an em dash`);
    assert.ok(title.length <= 45, `${file}: title is too verbose`);
  }
});

test('free skill package has a standalone entrypoint and truthful marketplace status', () => {
  const skill = read('agensi/claude-boss-workflow/SKILL.md');
  const listing = read('agensi/LISTING.md');
  const homepage = read('docs/index.html');
  const readme = read('README.md');
  assert.match(skill, /^---\r?\nname: claude-boss-workflow\r?\n/m);
  assert.match(skill, /instruction-only/i);
  assert.match(listing, /FREE \(\$0\)/);
  assert.match(listing, /PENDING REVIEW/);
  assert.match(homepage, /id="free-skill"/);
  assert.match(homepage, /Marketplace review pending/);
  assert.match(readme, /Agensi status/);
  assert.match(readme, /is live as a free instruction-only skill/);
  assert.ok(homepage.includes('https://agensi.io/skills/claude-boss-workflow'));
  for (const reference of ['cli.md', 'verification.md']) {
    assert.ok(fs.existsSync(path.join(root, 'agensi/claude-boss-workflow/references', reference)));
  }
});
