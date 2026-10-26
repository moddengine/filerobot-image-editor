import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const temp = mkdtempSync(join(tmpdir(), 'filerobot-packed-'));
const tarball = readdirSync('.').find((name) => name.endsWith('.tgz'));
assert.ok(tarball, 'Pack the distribution before running the smoke test');
execFileSync('tar', ['-xzf', tarball, '-C', temp]);
const pkg = JSON.parse(
  readFileSync(join(temp, 'package/package.json'), 'utf8'),
);
assert.equal(pkg.dependencies, undefined);
assert.equal(pkg.peerDependencies, undefined);
assert.equal(pkg.scripts, undefined);
assert.ok(
  readFileSync(join(temp, 'package/THIRD_PARTY_NOTICES.txt'), 'utf8').includes(
    'react@18.2.0',
  ),
);
assert.ok(
  !readFileSync(join(temp, 'package/index.d.ts'), 'utf8').includes(
    "from 'react",
  ),
);
const server = createServer((req, res) => {
  if (req.url === '/index.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(readFileSync(join(temp, 'package/index.js')));
  } else {
    res.end(
      '<!doctype html><html><body style="margin:0"><div id="editor" style="height:100vh"></div></body></html>',
    );
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    const { default: Editor } = await import('/index.js');
    const image = document.createElement('canvas');
    image.width = 80;
    image.height = 60;
    const ctx = image.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(20, 20, 20, 20);
    window.editor = new Editor(document.querySelector('#editor'), {
      source: image.toDataURL(),
      tabsIds: ['Adjust', 'Finetune', 'Filters', 'Resize'],
      defaultTabId: 'Adjust',
      defaultToolId: 'Crop',
      defaultSavedImageName: 'test',
      defaultSavedImageType: 'png',
      savingPixelRatio: 1,
      Crop: { presetsItems: [{ titleKey: 'squareCrop', ratio: 1 }] },
      translations: { save: 'Save As', squareCrop: '1:1' },
      onBeforeSave: () => false,
      onSave: (data) => {
        window.saved = {
          width: data.imageCanvas.width,
          height: data.imageCanvas.height,
          mime: data.mimeType,
        };
      },
    });
    window.editor.render();
  });
  await page.locator('canvas').first().waitFor();
  await page.getByText('Finetune', { exact: true }).click();
  await page.getByText('Filters', { exact: true }).click();
  await page.getByText('Resize', { exact: true }).click();
  await page.evaluate(() =>
    window.editor.updateState({ resize: { width: 40, height: 30 } }),
  );
  await page.waitForFunction(() => {
    try {
      const { imageData } = window.editor.getCurrentImgData(
        { name: 'test', extension: 'png' },
        1,
      );
      return (
        imageData.imageCanvas.width === 40 &&
        imageData.imageCanvas.height === 30
      );
    } catch {
      return false;
    }
  });
  const data = await page.evaluate(() => {
    const { imageData } = window.editor.getCurrentImgData(
      { name: 'test', extension: 'png' },
      1,
    );
    return {
      width: imageData.imageCanvas.width,
      height: imageData.imageCanvas.height,
      alpha: imageData.imageCanvas.getContext('2d').getImageData(0, 0, 1, 1)
        .data[3],
    };
  });
  assert.deepEqual(data, { width: 40, height: 30, alpha: 0 });
  await page.getByRole('button', { name: 'Save As', exact: true }).click();
  await page.waitForFunction(() => window.saved);
  assert.deepEqual(await page.evaluate(() => window.saved), {
    width: 40,
    height: 30,
    mime: 'image/png',
  });
  await page.evaluate(() => window.editor.terminate());
  assert.equal(await page.locator('#editor').innerHTML(), '');
  assert.deepEqual(errors, []);
  console.log(
    'Packed ESM editor: import, tabs, resize, transparent PNG export, save and terminate passed',
  );
} finally {
  await browser?.close();
  server.close();
  rmSync(temp, { recursive: true, force: true });
}
