#!/usr/bin/env node

const GetConfig = require('./src/utils/get-config');
const program = require('commander');

const CUtils = require('./src/utils/common-utils');
const WatchUtils = require('./src/watch-actions/watch-utils');
const ActionCreated = require('./src/watch-actions/action-created');
const SyncUtils = require('./src/sync-commands/sync-utils');
const LocalWatcher = require('./src/utils/local-watcher');
const CacheUtils = require('./src/utils/cache-utils');
const LocalTraversal = require('./src/utils/local-traversal');

program.option('-f, --force', 'skip local/remote equality check');

program.parse(process.argv);

async function run() {
    if (!program.force) {
        await CUtils.wrapUserErrors(() => SyncUtils.errorIfDifferent(true));

        await CUtils.wrapUserErrors(SyncUtils.errorIfMultWatch);
    }

    await startWatcher();
}

async function startWatcher() {
    CUtils.watchMsg('Started');

    const conf = await new GetConfig().run();

    const local = await CacheUtils.getCached(conf, 'local_items');

    let pathToData = local.locPathToData;

    while(true) {
        pathToData = await watchIteration(conf, pathToData);
    }
}

async function watchIteration(conf, pathToData) {
    const handler = new LocalWatcher(conf, pathToData, handleEvent);

    pathToData = await new LocalTraversal(conf.PLAYCANVAS_TARGET_DIR, handler).run();

    await CUtils.waitMs(1000); // todo

    return pathToData;
}

async function handleEvent(e, conf) {
    return WatchUtils.shouldKeepEvent(e, conf) &&
        !conf.PLAYCANVAS_DRY_RUN &&
        handleGoodEvent(e, conf);
}

async function handleGoodEvent(e, conf) {
    if (e.action === 'ACTION_MODIFIED') {
        await eventModified(e, conf);

    } else if (e.action === 'ACTION_DELETED') {
        const remotePath = await WatchUtils.actionDeleted(e, conf);

        CUtils.watchMsg(`Deleted ${remotePath}`);

    } else if (e.action === 'ACTION_CREATED') {
        await eventCreated(e, conf);
    }
}

async function eventModified(e, conf) {
    if (CUtils.eventHasAsset(e, conf)) {
        const id = await WatchUtils.actionModified(e.fullPath, conf);

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
