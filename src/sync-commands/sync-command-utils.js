import path from 'path';

import OverwriteAllLocalWithRemote from './overwrite-all-local-with-remote.js';
import OverwriteAllRemoteWithLocal from './overwrite-all-remote-with-local.js';
import SyncUtils from './sync-utils.js';
import DiffStrings from '../diff/diff-strings.js';
import GetConfig from '../utils/get-config.js';
import PathUtils from '../utils/path-utils.js';
import ActionRenamed from '../watch-actions/action-renamed.js';
import WatchUtils from '../watch-actions/watch-utils.js';

const SCUtils = {
    downloadSingleFile: function (remotePath) {
        const limitToItems = PathUtils.remotePathToData(remotePath);

        return new OverwriteAllLocalWithRemote(limitToItems).run();
    },

    uploadSingleFile: function (remotePath) {
        const limitToItems = PathUtils.remotePathToData(remotePath);

        return new OverwriteAllRemoteWithLocal(limitToItems).run();
    },

    renameItem: async function (oldPath, newPath) {
        const conf = await new GetConfig().run();

        const h = {
            remoteOldPath: oldPath,
            remoteNewDir: PathUtils.remoteDirFromParam(newPath),
            newFileName: path.basename(newPath)
        };

        await new ActionRenamed(h, conf).run();

        console.log(`Renamed ${oldPath} to ${newPath}`);
    },

    deleteItem: async function (remotePath) {
        const conf = await new GetConfig().run();

        await WatchUtils.actionDeleted(remotePath, conf);

        console.log(`Deleted ${remotePath}`);
    },

    diffSingleFile: async function (remotePath) {
        const conf = await new GetConfig().run();

        const remoteStr = await SyncUtils.remoteFileStr(remotePath, conf);

        const localStr = SyncUtils.localFileStr(remotePath, conf);

        new DiffStrings(remoteStr, localStr).run();
    },

    reportIgnoredAssets: async function () {
        await SyncUtils.errorIfDifferent(false);

        const conf = await new GetConfig().run();

        SyncUtils.reportList(conf.store.activeAssets, 'Assets matched by pcignore.txt');
    }
};

export default SCUtils;
