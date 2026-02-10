#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Command } from 'commander';

import OverwriteAllLocalWithRemote from '../src/sync-commands/overwrite-all-local-with-remote.js';
import OverwriteAllRemoteWithLocal from '../src/sync-commands/overwrite-all-remote-with-local.js';
import SCUtils from '../src/sync-commands/sync-command-utils.js';
import SyncUtils from '../src/sync-commands/sync-utils.js';
import CacheUtils from '../src/utils/cache-utils.js';
import CUtils from '../src/utils/common-utils.js';
import GetConfig from '../src/utils/get-config.js';
import PathUtils from '../src/utils/path-utils.js';
import ActionCreated from '../src/watch-actions/action-created.js';
import WatchUtils from '../src/watch-actions/watch-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

// ---- global option pre-processing ----
// Commander only parses parent-level options that appear before the
// subcommand name.  To allow global options in any position (e.g.
// "pcsync watch -k KEY"), we extract them from argv first, set them
// as environment variables, and pass the cleaned argv to Commander.

const VALUE_OPTS = {
    '-k': 'PLAYCANVAS_API_KEY',
    '--api-key': 'PLAYCANVAS_API_KEY',
    '-p': 'PLAYCANVAS_PROJECT_ID',
    '--project-id': 'PLAYCANVAS_PROJECT_ID',
    '-b': 'PLAYCANVAS_BRANCH_ID',
    '--branch-id': 'PLAYCANVAS_BRANCH_ID',
    '-t': 'PLAYCANVAS_TARGET_DIR',
    '--target-dir': 'PLAYCANVAS_TARGET_DIR',
    '--base-url': 'PLAYCANVAS_BASE_URL'
};

const BOOL_OPTS = {
    '-n': 'PLAYCANVAS_DRY_RUN',
    '--dry-run': 'PLAYCANVAS_DRY_RUN',
    '--verbose': 'PLAYCANVAS_VERBOSE'
};

function preprocessArgs(argv) {
    const cleaned = [];
    let i = 0;

    while (i < argv.length) {
        const arg = argv[i];

        // Handle --option=value syntax
        const eqIdx = arg.indexOf('=');
        if (eqIdx !== -1) {
            const key = arg.substring(0, eqIdx);
            if (VALUE_OPTS[key]) {
                process.env[VALUE_OPTS[key]] = arg.substring(eqIdx + 1);
                i++;
                continue;
            }
        }

        if (VALUE_OPTS[arg] && i + 1 < argv.length) {
            process.env[VALUE_OPTS[arg]] = argv[i + 1];
            i += 2;
        } else if (BOOL_OPTS[arg]) {
            process.env[BOOL_OPTS[arg]] = '1';
            i++;
        } else {
            cleaned.push(arg);
            i++;
        }
    }

    return cleaned;
}

const program = new Command();

program
.name('pcsync')
.description('Sync files between PlayCanvas and your local machine')
.version(pkg.version)
.option('-k, --api-key <key>', 'PlayCanvas API key (overrides config)')
.option('-p, --project-id <id>', 'PlayCanvas project ID (overrides config)')
.option('-b, --branch-id <id>', 'PlayCanvas branch ID (overrides config)')
.option('-t, --target-dir <dir>', 'local target directory (overrides config)')
.option('--base-url <url>', 'PlayCanvas API base URL (overrides config)')
.option('-n, --dry-run', 'show what would happen without making changes')
.option('--verbose', 'print detailed output including config values');

// ---- diff [file] ----

program
.command('diff [file]')
.description('compare local and remote files (all files if no file specified)')
.option('-r, --regexp <pattern>', 'filter files matching the provided regular expression')
.option('-e, --ext <extensions>', 'filter files by extension (comma-separated, e.g. jpg,png)')
.action((file, cmdObj) => {
    if (file) {
        CUtils.wrapUserErrors(() => {
            return SCUtils.diffSingleFile(file);
        });
    } else {
        CUtils.handleForceRegOpts(cmdObj);

        CUtils.wrapUserErrors(() => {
            return SyncUtils.reportDiffAll();
        });
    }
});

// ---- pull [file] ----

program
.command('pull [file]')
.description('download remote files to local (all files if no file specified)')
.option('-r, --regexp <pattern>', 'filter files matching the provided regular expression')
.option('-e, --ext <extensions>', 'filter files by extension (comma-separated, e.g. jpg,png)')
.option('-y, --yes', 'skip confirmation prompt')
.action((file, cmdObj) => {
    if (file) {
        CUtils.setForceEnv(file);

        CUtils.wrapUserErrors(() => {
            return SCUtils.downloadSingleFile(file);
        });
    } else {
        CUtils.handleForceRegOpts(cmdObj);

        const cb = function () {
            return new OverwriteAllLocalWithRemote().run();
        };

        return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
    }
});

// ---- push [file] ----

program
.command('push [file]')
.description('upload local files to remote (all files if no file specified)')
.option('-r, --regexp <pattern>', 'filter files matching the provided regular expression')
.option('-e, --ext <extensions>', 'filter files by extension (comma-separated, e.g. jpg,png)')
.option('-y, --yes', 'skip confirmation prompt')
.action((file, cmdObj) => {
    if (file) {
        CUtils.setForceEnv(file);

        CUtils.wrapUserErrors(() => {
            return SCUtils.uploadSingleFile(file);
        });
    } else {
        CUtils.handleForceRegOpts(cmdObj);

        const cb = function () {
            return new OverwriteAllRemoteWithLocal().run();
        };

        return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
    }
});

// ---- rename ----

program
.command('rename <oldPath> <newPath>')
.description('rename or move a remote file or folder')
.action((oldPath, newPath) => {
    CUtils.wrapUserErrors(() => {
        return SCUtils.renameItem(oldPath, newPath);
    });
});

// ---- rm ----

program
.command('rm <path>')
.description('remove a remote file or folder')
.action((filePath) => {
    CUtils.setForceEnv(filePath);

    CUtils.wrapUserErrors(() => {
        return SCUtils.deleteItem(filePath);
    });
});

// ---- watch ----

program
.command('watch')
.description('watch local directory and sync changes to remote in real-time')
.option('-f, --force', 'skip local/remote equality and multi-instance checks')
.action(async (cmdObj) => {
    if (!cmdObj.force) {
        await CUtils.wrapUserErrors(() => SyncUtils.errorIfDifferent(true));

        await CUtils.wrapUserErrors(SyncUtils.errorIfMultWatch);
    }

    await startWatcher();
});

// ---- ignore ----

program
.command('ignore')
.description('list assets matched by pcignore.txt')
.action(() => {
    CUtils.wrapUserErrors(() => {
        return SCUtils.reportIgnoredAssets();
    });
});

// ---- init ----

program
.command('init')
.description('create a pcconfig.json in the current directory')
.action(async () => {
    const { runInit } = await import('../src/commands/init.js');
    await runInit();
});

// ---- deprecated commands (hidden from help) ----

function deprecationWarning(oldCmd, newCmd) {
    console.warn(`Warning: '${oldCmd}' is deprecated. Use '${newCmd}' instead.`);
}

const diffAllCmd = new Command('diffAll');
diffAllCmd
.option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
.option('-e, --ext <extensions>', 'handle files with provided extensions')
.action((cmdObj) => {
    deprecationWarning('pcsync diffAll', 'pcsync diff');
    CUtils.handleForceRegOpts(cmdObj);

    CUtils.wrapUserErrors(() => {
        return SyncUtils.reportDiffAll();
    });
});
program.addCommand(diffAllCmd, { hidden: true });

const pullAllCmd = new Command('pullAll');
pullAllCmd
.option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
.option('-e, --ext <extensions>', 'handle files with provided extensions')
.option('-y, --yes', 'Automatically answer "yes" to any prompts.')
.action((cmdObj) => {
    deprecationWarning('pcsync pullAll', 'pcsync pull');
    CUtils.handleForceRegOpts(cmdObj);

    const cb = function () {
        return new OverwriteAllLocalWithRemote().run();
    };

    return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
});
program.addCommand(pullAllCmd, { hidden: true });

const pushAllCmd = new Command('pushAll');
pushAllCmd
.option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
.option('-e, --ext <extensions>', 'handle files with provided extensions')
.option('-y, --yes', 'Automatically answer "yes" to any prompts.')
.action((cmdObj) => {
    deprecationWarning('pcsync pushAll', 'pcsync push');
    CUtils.handleForceRegOpts(cmdObj);

    const cb = function () {
        return new OverwriteAllRemoteWithLocal().run();
    };

    return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
});
program.addCommand(pushAllCmd, { hidden: true });

const parseIgnoreCmd = new Command('parseIgnore');
parseIgnoreCmd
.action(() => {
    deprecationWarning('pcsync parseIgnore', 'pcsync ignore');

    CUtils.wrapUserErrors(() => {
        return SCUtils.reportIgnoredAssets();
    });
});
program.addCommand(parseIgnoreCmd, { hidden: true });

// ---- watch helper functions (native fs.watch) ----

async function startWatcher() {
    const conf = await new GetConfig().run();

    console.log(`Started in ${conf.PLAYCANVAS_TARGET_DIR}`);

    const local = await CacheUtils.getCached(conf, 'local_items');

    const pathToData = local.locPathToData;

    const debounceTimers = {};

    const watcher = fs.watch(
        conf.PLAYCANVAS_TARGET_DIR,
        { recursive: true },
        (eventType, filename) => {
            if (!filename) return;

            // Normalize path separators to OS-native format
            const relativePath = filename.replace(/[\\/]/g, path.sep);
            const fullPath = path.join(conf.PLAYCANVAS_TARGET_DIR, relativePath);

            // Debounce: reset timer for this path on every event
            if (debounceTimers[fullPath]) {
                clearTimeout(debounceTimers[fullPath]);
            }

            debounceTimers[fullPath] = setTimeout(() => {
                delete debounceTimers[fullPath];
                processChange(fullPath, conf, pathToData);
            }, WatchUtils.DEBOUNCE_MS);
        }
    );

    // Keep process alive and handle clean shutdown
    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        watcher.close();
        process.exit(0);
    });
}

async function processChange(fullPath, conf, pathToData) {
    const rootDir = conf.PLAYCANVAS_TARGET_DIR;

    // Build the relative path parts from the full path
    const relative = path.relative(rootDir, fullPath);
    const pathAr = relative.split(path.sep);
    const remotePath = PathUtils.arToSlashForwPath(pathAr);
    const itemName = pathAr[pathAr.length - 1];

    const parentAr = pathAr.slice(0, pathAr.length - 1);
    const parentFull = PathUtils.pathArToFullLocal(rootDir, parentAr);
    const parentRemote = PathUtils.arToSlashForwPath(parentAr);

    // Stat the file to determine if it exists and what type it is
    const stat = await PathUtils.fsWrap('stat', fullPath);

    if (!stat) {
        // File/directory no longer exists -- it was deleted
        await handleDeletion(fullPath, pathToData, conf);
        return;
    }

    const itemData = {
        itemName,
        fullPath,
        remotePath,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        modTime: stat.mtime.getTime(),
        hash: null,
        pathArray: pathAr,
        parentFull,
        parentRemote
    };

    const cached = pathToData[fullPath];

    if (stat.isFile()) {
        if (cached) {
            await handleKnownFile(itemData, cached, pathToData, conf);
        } else {
            await handleCreatedFile(itemData, pathToData, conf);
        }
    } else if (stat.isDirectory()) {
        if (!cached) {
            // New directory
            pathToData[fullPath] = itemData;
            await triggerEvent('ACTION_CREATED', itemData, conf);
        }
    }
}

async function handleKnownFile(itemData, cached, pathToData, conf) {
    // If the hash was not yet computed, compute it now.
    // If modTime also changed, the file was modified before we had a
    // baseline hash, so trigger the sync event immediately.
    if (!cached.hash) {
        itemData.hash = await CUtils.fileToMd5Hash(itemData.fullPath);
        pathToData[itemData.fullPath] = itemData;

        if (itemData.modTime !== cached.modTime) {
            await triggerEvent('ACTION_MODIFIED', itemData, conf);
        }
        return;
    }

    // Only recalculate hash if the modification time changed
    if (itemData.modTime !== cached.modTime) {
        itemData.hash = await CUtils.fileToMd5Hash(itemData.fullPath);

        if (itemData.hash !== cached.hash) {
            pathToData[itemData.fullPath] = itemData;
            await triggerEvent('ACTION_MODIFIED', itemData, conf);
        } else {
            pathToData[itemData.fullPath] = itemData;
        }
    } else {
        itemData.hash = cached.hash;
        pathToData[itemData.fullPath] = itemData;
    }
}

async function handleCreatedFile(itemData, pathToData, conf) {
    itemData.hash = await CUtils.fileToMd5Hash(itemData.fullPath);
    pathToData[itemData.fullPath] = itemData;
    await triggerEvent('ACTION_CREATED', itemData, conf);
}

async function handleDeletion(fullPath, pathToData, conf) {
    // Collect all cached paths that are under the deleted path (or the path itself)
    const deleted = Object.keys(pathToData).filter((p) => {
        return p === fullPath || p.startsWith(fullPath + path.sep);
    });

    // Sort children before parents (longest paths first)
    deleted.sort((a, b) => b.length - a.length);

    for (const p of deleted) {
        const data = pathToData[p];
        delete pathToData[p];
        await triggerEvent('ACTION_DELETED', data, conf);
    }
}

async function triggerEvent(action, itemData, conf) {
    const event = { action };
    Object.assign(event, itemData);
    await handleEvent(event, conf);
}

async function handleEvent(e, conf) {
    if (WatchUtils.shouldKeepEvent(e, conf) && !conf.PLAYCANVAS_DRY_RUN) {
        return await handleGoodEvent(e, conf);
    }
}

async function handleGoodEvent(e, conf) {
    if (e.action === 'ACTION_MODIFIED') {
        await eventModified(e, conf);

    } else if (e.action === 'ACTION_DELETED') {
        const deleted = await WatchUtils.actionDeleted(e.remotePath, conf);

        if (deleted) {
            console.log(`Deleted ${e.remotePath}`);
        } else {
            console.log(`Skipped deletion of remote folder ${e.remotePath} (contains unsynced assets)`);
        }

    } else if (e.action === 'ACTION_CREATED') {
        await eventCreated(e, conf);
    }
}

async function eventModified(e, conf) {
    if (CUtils.eventHasAsset(e, conf)) {
        const id = await WatchUtils.actionModified(e, conf);

        WatchUtils.reportWatchAction(id, 'Updated', conf);
    }
}

async function eventCreated(e, conf) {
    if (!CUtils.eventHasAsset(e, conf)) {
        const id = await new ActionCreated(e, conf).run();

        WatchUtils.reportWatchAction(id, 'Created', conf);
    }
}

program.parse(preprocessArgs(process.argv));
