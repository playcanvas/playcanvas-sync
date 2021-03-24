const fs = require('fs');
const CUtils = require('../utils/common-utils');
const PathUtils = require('../utils/path-utils');
const TypeUtils = require('../utils/type-utils');

const WatchUtils = {
  actionModified: async function (fullPath, conf) {
    const assetId = CUtils.getAssetId(fullPath, conf);

    const url = `/assets/${assetId}`;

    const h = {
      branchId: conf.PLAYCANVAS_BRANCH_ID,
      file: fs.createReadStream(fullPath)
    };

    await conf.client.putForm(url, h);

    return assetId;
  },

  actionDeleted: async function (fullPath, conf) {
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

      const s = shouldKeep ? 'YES' : 'NO';

      console.log(`SHOULD APPLY TO REMOTE: ${s}`);

      console.log('------------------');
    }
  },

  shouldKeepEvent: function (h, conf) {
    let res = (h.isFile && !TypeUtils.isBadFile(h.itemName, h.remotePath, conf)) ||
      (h.isDirectory && !CUtils.isBadDir(h.remotePath, conf));

    res = res && !CUtils.isBadDir(h.parentRemote, conf);

    WatchUtils.verboseEvent(h, res, conf);

    return res;
  }
};

module.exports = WatchUtils;
