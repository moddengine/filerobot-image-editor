import { build } from 'esbuild';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, 'web-dist');
mkdirSync(out, { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: ['packages/filerobot-image-editor/src/index.js'],
  outfile: join(out, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
  metafile: true,
  loader: { '.js': 'jsx' },
  plugins: [
    {
      name: 'inline-css',
      setup(build) {
        build.onLoad({ filter: /\.css$/ }, async ({ path }) => ({
          contents:
            'const style = document.createElement("style"); style.textContent = ' +
            JSON.stringify(readFileSync(path, 'utf8')) +
            '; document.head.appendChild(style);',
          loader: 'js',
        }));
      },
    },
  ],
  nodePaths: [resolve(here, 'node_modules')],
  alias: {
    'react-filerobot-image-editor/src': resolve(
      root,
      'packages/react-filerobot-image-editor/src',
    ),
  },
  define: { 'process.env.NODE_ENV': '"production"' },
});
if (
  Object.values(result.metafile.outputs).some((output) => output.imports.length)
) {
  throw new Error('Release bundle must not contain external imports');
}
const packages = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.includes('node_modules/')) continue;
  let dir = dirname(resolve(root, input));
  while (dirname(dir) !== dir) {
    if (
      existsSync(join(dir, 'package.json')) &&
      JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name
    )
      break;
    dir = dirname(dir);
  }
  packages.add(dir);
}
const notices = [...packages].sort().map((dir) => {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const files = readdirSync(dir).filter((name) =>
    /^(license|licence|copying|notice)(\.|$)/i.test(name),
  );
  if (!files.length) {
    const fallback = join(
      here,
      'licenses',
      `${pkg.name.replaceAll('/', '-')}.txt`,
    );
    if (!existsSync(fallback))
      throw new Error(`Missing license for ${pkg.name}`);
    return `${pkg.name}@${pkg.version} (${pkg.license})\n${readFileSync(fallback, 'utf8')}`;
  }
  return `${pkg.name}@${pkg.version} (${pkg.license})\n${files.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n')}`;
});
writeFileSync(
  join(out, 'THIRD_PARTY_NOTICES.txt'),
  notices.join('\n\n---\n\n'),
);
cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));
cpSync(join(here, 'index.d.ts'), join(out, 'index.d.ts'));
writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: '@moddengine/filerobot-image-editor-web',
      version: '4.9.0-cms.1',
      type: 'module',
      main: './index.js',
      types: './index.d.ts',
      exports: { '.': { types: './index.d.ts', import: './index.js' } },
      files: ['index.js', 'index.d.ts', 'LICENSE', 'THIRD_PARTY_NOTICES.txt'],
      license: 'MIT',
      repository: 'github:moddengine/filerobot-image-editor',
    },
    null,
    2,
  ) + '\n',
);
