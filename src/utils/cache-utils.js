const LoadAssets = require('../load-assets.js');
const LocalContents = require('./local-contents.js');
const LocalTraversal = require('./local-traversal.js');

const CacheUtils = {
    cachedData: {},

    getCached: async function (conf, type) {
        if (!CacheUtils.cachedData[type]) {
            CacheUtils.cachedData[type] = await CacheUtils.loadData(conf, type);
        }

        return CacheUtils.cachedData[type];
    },

    loadData: function (conf, type) {
        if (type === 'remote_assets') {
            return newLoadAssets(conf).run();

        } else if (type === 'local_items') {
            return CacheUtils.loadLocalItems(conf);
        }
    },

    loadLocalItems: function (conf) {
        const handler = newLocalContents(conf);

        return newLocalTraversal(
            conf.PLAYCANVAS_TARGET_DIR,
            handler
        ).run();
    }
};

module.exports = CacheUtils;
