const fs = require('fs');
const CUtils = require('../utils/common-utils');
const TypeUtils = require('../utils/type-utils');

const WatchUtils = {
  WATCH_LOOP_INTERVAL: 1000,
  WATCH_ITEM_INTERVAL: 10,

  actionModified: async function (data, conf) {
    const assetId = conf.store.getAssetId(data.remotePath);

    const url = `/assets/${assetId}`;

    const h = {
      branchId: conf.PLAYCANVAS_BRANCH_ID,
      file: fs.createReadStream(data.fullPath)
    };

    await conf.client.putForm(url, h);

    return assetId;
  },

  actionDeleted: async function (remotePath, conf) {
    const assetId = conf.store.getAssetId(remotePath);

    conf.store.handleDeletedAsset(assetId);

    const url = `/assets/${assetId}?branchId=${conf.PLAYCANVAS_BRANCH_ID}`;

    await conf.client.methodDelete(url);
  },

  reportWatchAction: function (assetId, tag, conf) {
    const remotePath = conf.store.idToPath[assetId];

    const s = `${tag} ${remotePath}`;

    console.log(s);
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
