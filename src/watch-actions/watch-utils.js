const fs = require('fs');
const CUtils = require('../utils/common-utils');
const PathUtils = require('../utils/path-utils');

const WatchUtils = {
  actionModified: async function (e, conf) {
    const fullPath = PathUtils.eventToFullPath(e);

    const assetId = CUtils.getAssetId(fullPath, conf);

    const url = `/assets/${assetId}`;

    const h = {
      branchId: conf.PLAYCANVAS_BRANCH_ID,
      file: fs.createReadStream(fullPath)
    };

    await conf.client.putForm(url, h);

    return assetId;
  },

  actionDeleted: async function (e, conf) {
    const fullPath = PathUtils.eventToFullPath(e);

    const assetId = CUtils.getAssetId(fullPath, conf);

    const remotePath = conf.store.idToPath[assetId];

    conf.store.handleDeletedAsset(assetId);

    const url = `/assets/${assetId}?branchId=${conf.PLAYCANVAS_BRANCH_ID}`;

    await conf.client.methodDelete(url);

    return remotePath;
  },

  reportWatchAction: function (assetId, tag, conf) {
    const remotePath = conf.store.idToPath[assetId];

    const s = `${tag} ${remotePath}`;

    CUtils.watchMsg(s);
  },

  verboseEvent: function (h, shouldKeep, conf) {
    if (conf.PLAYCANVAS_VERBOSE) {
      console.log('------------------');

      console.log('EVENT:');

      console.log(h);

      console.log(`SHOULD APPLY TO REMOTE: ${shouldKeep}`);

      console.log('------------------');
    }
  },

  shouldKeepEvent: function (h, conf) {
    let res = (h.isFile && !TypeUtils.isBadFile(h.itemName, h.remotePath, conf)) ||
        (h.isDir && !CUtils.isBadDir(h.fullPath, conf));

    res = res && !CUtils.isBadDir(h.parentFull, conf);

    WatchUtils.verboseEvent(h, res, conf);

    return res;
  }
};

module.exports = WatchUtils;
