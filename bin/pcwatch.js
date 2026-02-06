#!/usr/bin/env node

import { Command } from 'commander';

import SyncUtils from '../src/sync-commands/sync-utils.js';
import CacheUtils from '../src/utils/cache-utils.js';
import CUtils from '../src/utils/common-utils.js';
import GetConfig from '../src/utils/get-config.js';
import LocalTraversal from '../src/utils/local-traversal.js';
import LocalWatcher from '../src/utils/local-watcher.js';
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

    let pathToData = local.locPathToData;

    while (true) {
        pathToData = await watchIteration(conf, pathToData);
    }
}

async function watchIteration(conf, pathToData) {
    await CUtils.waitMs(WatchUtils.WATCH_LOOP_INTERVAL);

    const handler = new LocalWatcher(
        conf,
        pathToData,
        WatchUtils.WATCH_ITEM_INTERVAL,
        handleEvent
    );

    return new LocalTraversal(conf.PLAYCANVAS_TARGET_DIR, handler).run();
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
