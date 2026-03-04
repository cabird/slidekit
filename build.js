#!/usr/bin/env node
const { execSync } = require('child_process');
const { version } = require('./package.json');

const define = `--define:__SK_VERSION__='"${version}"'`;

const commands = [
  `esbuild slidekit/slidekit.ts --bundle --format=esm --outfile=slidekit/dist/slidekit.bundle.js --sourcemap ${define}`,
  `esbuild slidekit/slidekit.ts --bundle --format=esm --minify --outfile=slidekit/dist/slidekit.bundle.min.js --sourcemap ${define}`,
  `esbuild slidekit/src/debug.ts --bundle --format=esm --outfile=slidekit/dist/slidekit-debug.bundle.js --sourcemap`,
];

for (const cmd of commands) {
  execSync(cmd, { stdio: 'inherit' });
}
