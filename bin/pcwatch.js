#!/usr/bin/env node

/**
 * Deprecated: use 'pcsync watch' instead.
 *
 * This wrapper forwards all arguments to 'pcsync watch' and will be
 * removed in a future major version.
 */

import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

console.warn('Warning: \'pcwatch\' is deprecated. Use \'pcsync watch\' instead.');

const pcsyncBin = fileURLToPath(new URL('./pcsync.js', import.meta.url));

// Forward all arguments to 'pcsync watch'
const args = ['watch', ...process.argv.slice(2)];

try {
    execFileSync(process.execPath, [pcsyncBin, ...args], {
        stdio: 'inherit'
    });
} catch (e) {
    // execFileSync throws on non-zero exit; the child's output was
    // already printed via stdio: 'inherit', so just propagate the code.
    process.exit(e.status ?? 1);
}
