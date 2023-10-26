const OverwriteAllLocalWithRemote = require('./overwrite-all-local-with-remote.js');
const OverwriteAllRemoteWithLocal = require('./overwrite-all-remote-with-local.js');
const PathUtils = require('../utils/path-utils.js');
const SyncUtils = require('./sync-utils.js');
const ActionRenamed = require('../watch-actions/action-renamed.js');
const GetConfig = require('../utils/get-config.js');
const WatchUtils = require('../watch-actions/watch-utils.js');
const DiffStrings = require('../diff/diff-strings.js');
const path = require('path');

const SCUtils = {
    downloadSingleFile: function (remotePath) {
        const limitToItems = PathUtils.remotePathToData(remotePath);

        return newOverwriteAllLocalWithRemote(limitToItems).run();
    },

    uploadSingleFile: function (remotePath) {
        const limitToItems = PathUtils.remotePathToData(remotePath);

        return newOverwriteAllRemoteWithLocal(limitToItems).run();
    },

    renameItem: async function (oldPath, newPath) {
        const conf = await newGetConfig().run();

        const h = {
            remoteOldPath: oldPath,
            remoteNewDir: PathUtils.remoteDirFromParam(newPath),
            newFileName: path.basename(newPath)
        };

        await newActionRenamed(h, conf).run();

        console.log(`Renamed ${oldPath} to ${newPath}`);
    },

    deleteItem: async function (remotePath) {
        const conf = await newGetConfig().run();

        await WatchUtils.actionDeleted(remotePath, conf);

        console.log(`Deleted ${remotePath}`);
    },

    diffSingleFile: async function (remotePath) {
        const conf = await newGetConfig().run();

        const remoteStr = await SyncUtils.remoteFileStr(remotePath, conf);

        const localStr = SyncUtils.localFileStr(remotePath, conf);

        newDiffStrings(remoteStr, localStr).run();
    },

    reportIgnoredAssets: async function () {
        await SyncUtils.errorIfDifferent(false);

        const conf = await newGetConfig().run();

        SyncUtils.reportList(conf.store.activeAssets, 'Assets matched by pcignore.txt');
    }
};

module.exports = SCUtils;
