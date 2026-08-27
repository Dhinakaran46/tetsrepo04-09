// Swaps capacitor.config.ts between the production and dev(live-reload)
// variants. Capacitor's CLI (sync/open/run/build) always reads
// capacitor.config.ts by default - this version of the CLI has no --config
// flag to point it at a different file - so switching configs means
// physically copying the right source file over it.
//
// Usage: node scripts/use-capacitor-config.js dev|prod
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'capacitor.config.ts');

const sources = {
  dev: path.join(root, 'capacitor.config.dev.ts'),
  // capacitor.config.prod.ts is the checked-in source of truth for
  // production; capacitor.config.ts is just its active copy, so re-copying
  // prod here (rather than leaving whatever's already there) guards against
  // accidentally shipping a stale dev config if someone forgets to switch
  // back before a release build.
  prod: path.join(root, 'capacitor.config.prod.ts'),
};

const source = sources[target];
if (!source) {
  console.error(`Usage: node scripts/use-capacitor-config.js dev|prod`);
  process.exit(1);
}

fs.copyFileSync(source, destination);
console.log(`capacitor.config.ts <- ${path.basename(source)} (${target})`);
