const fs = require('fs');
const CUtils = require('../utils/common-utils');
const PathUtils = require('../utils/path-utils');
const nsfw = require('nsfw');
const IsGoodEvent = require('./is-good-event');

const ACTION_TO_NAME = {};
ACTION_TO_NAME[nsfw.actions.CREATED] = 'CREATED';
ACTION_TO_NAME[nsfw.actions.MODIFIED] = 'MODIFIED';
ACTION_TO_NAME[nsfw.actions.RENAMED] = 'RENAMED';
ACTION_TO_NAME[nsfw.actions.DELETED] = 'DELETED';

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

  verboseEvent: function (tag, v, conf) {
    if (conf.PLAYCANVAS_VERBOSE) {
      console.log('------------------');

      console.log(tag);

      console.log(v);

      console.log('------------------');
    }
  },

  shouldKeepEvent: function (h, conf) {
    WatchUtils.verboseEvent('ORIGINAL EVENT:', h, conf);

    const res = new IsGoodEvent(h, conf).run();

    WatchUtils.verboseEvent('SHOULD KEEP:', res, conf);

    return res;
  }
};

module.exports = WatchUtils;
