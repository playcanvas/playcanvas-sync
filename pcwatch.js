#!/usr/bin/env node

const nsfw = require('nsfw');
const GetConfig = require('./src/utils/get-config');
const program = require('commander');

const CUtils = require('./src/utils/common-utils');
const WatchUtils = require('./src/watch-actions/watch-utils');
const ActionCreated = require('./src/watch-actions/action-created');
const ActionRenamed = require('./src/watch-actions/action-renamed');
const SyncUtils = require('./src/sync-commands/sync-utils');

program.option('-f, --force', 'skip local/remote equality check');

program.parse(process.argv);

const WATCH_OPTS = { debounceMS: 1000 };

async function run() {
    if (!program.force) {
        await CUtils.wrapUserErrors(() => SyncUtils.errorIfDifferent(true));

        await CUtils.wrapUserErrors(SyncUtils.errorIfMultWatch);
    }

    await startWatcher();
}

async function startWatcher() {
    const conf = await new GetConfig().run();

    const watcher = await nsfw(
        conf.PLAYCANVAS_TARGET_DIR,
        function (events) {
            CUtils.wrapUserErrors(handleEvents, [events, conf]);
        },
        WATCH_OPTS
    );

    await watcher.start();

    CUtils.watchMsg('Started');
}

async function handleEvents(events, conf) {
    const a = WatchUtils.filterEvents(events, conf);

    if (conf.PLAYCANVAS_DRY_RUN) {
        return;
    }

    for (const e of a) {
        await handleFileEvent(e, conf);
    }
}

async function handleFileEvent(e, conf) {
    if (e.action === nsfw.actions.MODIFIED) {
        await eventModified(e, conf);

    } else if (e.action === nsfw.actions.RENAMED) {
        await eventRenamed(e, conf);

    } else if (e.action === nsfw.actions.DELETED) {
        const remotePath = await WatchUtils.actionDeleted(e, conf);

        CUtils.watchMsg(`Deleted ${remotePath}`);

    } else if (e.action === nsfw.actions.CREATED) {
        await eventCreated(e, conf);
    }
}

// sometimes file move appears as modified
async function eventModified(e, conf) {
    if (CUtils.eventHasAsset(e, conf)) {
        const id = await WatchUtils.actionModified(e, conf);

        WatchUtils.reportWatchAction(id, 'Updated', conf);

    } else {
        await eventCreated(e, conf);
    }
}

async function eventRenamed(e, conf) {
    if (CUtils.eventHasAsset(e, conf)) {
        const id = await new ActionRenamed(e, conf).run();

        WatchUtils.reportWatchAction(id, 'New name', conf);

    } else {
        CUtils.renameToCreateEvent(e);

        await eventCreated(e, conf);
    }
}

async function eventCreated(e, conf) {
    if (!CUtils.eventHasAsset(e, conf)) {
        const id = await new ActionCreated(e, conf).run();

        WatchUtils.reportWatchAction(id, 'Created', conf);
    }
}

run();
