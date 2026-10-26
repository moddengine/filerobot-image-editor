# ModdEngine standalone distribution

Based on upstream v4.9.0 (9d65834cc0f71d76e87742b90582a858d715789f).
React and all runtime dependencies are private to the ESM bundle. The published
package has no dependencies, peer dependencies, install scripts, or React types.

```sh
cd web-build
npm ci --legacy-peer-deps
npm run build
npm pack ../web-dist --pack-destination .
npx playwright install chromium
npm test
```

Tag a reviewed commit `moddengine-web-v4.9.0-cms.2` to build, test the packed
artifact, and publish the tarball as a GitHub release asset. Bump the version in
build.mjs for subsequent releases. Dependencies are locked in package-lock.json.
