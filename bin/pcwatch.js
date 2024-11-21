#!/usr/bin/env node

const GetConfig = require('../src/utils/get-config.js');
const program = require('commander');

const CUtils = require('../src/utils/common-utils.js');
const WatchUtils = require('../src/watch-actions/watch-utils.js');
const ActionCreated = require('../src/watch-actions/action-created.js');
const SyncUtils = require('../src/sync-commands/sync-utils.js');
const LocalWatcher = require('../src/utils/local-watcher.js');
const CacheUtils = require('../src/utils/cache-utils.js');
const LocalTraversal = require('../src/utils/local-traversal.js');

program.option('-f, --force', 'skip local/remote equality check');
program.option('-p, --profile <profile>', 'Use the profile specified in the config file')

program.parse(process.argv);

async function run() {
    CUtils.handleProfileOpts(program.opts());
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
    return WatchUtils.shouldKeepEvent(e, conf) &&
        !conf.PLAYCANVAS_DRY_RUN &&
        handleGoodEvent(e, conf);
}

async function handleGoodEvent(e, conf) {
    if (e.action === 'ACTION_MODIFIED') {
        await eventModified(e, conf);

    } else if (e.action === 'ACTION_DELETED') {
        await WatchUtils.actionDeleted(e.remotePath, conf);

        console.log(`Deleted ${e.remotePath}`);

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
