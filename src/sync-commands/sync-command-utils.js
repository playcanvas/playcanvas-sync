const OverwriteAllLocalWithRemote = require('./overwrite-all-local-with-remote');
const OverwriteAllRemoteWithLocal = require('./overwrite-all-remote-with-local');
const PathUtils = require('../utils/path-utils');
const SyncUtils = require('./sync-utils');
const ActionRenamed = require('../watch-actions/action-renamed');
const GetConfig = require('../utils/get-config');
const CUtils = require('../utils/common-utils');
const WatchUtils = require('../watch-actions/watch-utils');
const DiffStrings = require('../diff/diff-strings');

const SCUtils = {
  downloadSingleFile: function(remotePath) {
    const limitToItems = PathUtils.remotePathToData(remotePath);

    return new OverwriteAllLocalWithRemote(limitToItems).run();
  },

  uploadSingleFile: function(remotePath) {
    const limitToItems = PathUtils.remotePathToData(remotePath);

    return new OverwriteAllRemoteWithLocal(limitToItems).run();
  },

  renameItem: async function(oldPath, newPath) {
    const conf = await new GetConfig().run();

    const e = SyncUtils.makeRenameEvent(oldPath, newPath, conf);

    await new ActionRenamed(e, conf).run();

    CUtils.syncMsg(`Renamed ${oldPath} to ${newPath}`);
  },

  deleteItem: async function(filePath) {
    const conf = await new GetConfig().run();

    const p = PathUtils.fullPathToLocalFile(conf.PLAYCANVAS_TARGET_DIR, filePath);

    const e = CUtils.fullPathToEventData(p);

    await WatchUtils.actionDeleted(e, conf);

    CUtils.syncMsg(`Deleted ${filePath}`);
  },

  diffSingleFile: async function(filePath) {
    const conf = await new GetConfig().run();

    const remoteStr = await SyncUtils.remoteFileStr(filePath, conf);

    const localStr = SyncUtils.localFileStr(filePath, conf);

    new DiffStrings(remoteStr, localStr).run();
  },

  reportIgnoredAssets: async function () {
    await SyncUtils.errorIfDifferent(false);

    const conf = await new GetConfig().run();

    SyncUtils.reportList(conf.store.textAssets, 'Assets matched by pcignore.txt');
  }
};

module.exports = SCUtils;
