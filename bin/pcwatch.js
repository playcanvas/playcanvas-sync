#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { Command } from 'commander';

import SyncUtils from '../src/sync-commands/sync-utils.js';
import CacheUtils from '../src/utils/cache-utils.js';
import CUtils from '../src/utils/common-utils.js';
import GetConfig from '../src/utils/get-config.js';
import PathUtils from '../src/utils/path-utils.js';
import ActionCreated from '../src/watch-actions/action-created.js';
import WatchUtils from '../src/watch-actions/watch-utils.js';

const program = new Command();

program.option('-f, --force', 'skip local/remote equality check');

program.parse(process.argv);

async function run() {
    if (!program.opts().force) {
        await CUtils.wrapUserErrors(() => SyncUtils.errorIfDifferent(true));

        await CUtils.wrapUserErrors(SyncUtils.errorIfMultWatch);
    }

    await startWatcher();
}

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

run();
