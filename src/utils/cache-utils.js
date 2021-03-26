const LoadAssets = require('../load-assets');
const LocalContents = require('./local-contents');
const LocalTraversal = require('./local-traversal');

const CacheUtils = {
    cachedData: {},

    getCached: async function(conf, type, opts) {
        opts = opts || {};

        if (!CacheUtils.cachedData[type]) {
            CacheUtils.cachedData[type] = await CacheUtils.loadData(conf, type, opts);
        }

        return CacheUtils.cachedData[type];
    },

    loadData: function(conf, type, opts) {
        if (type === 'remote_assets') {
            return new LoadAssets(conf).run();

        } else if (type === 'local_items') {
            return CacheUtils.loadLocalItems(conf, opts);
        }
    },

    loadLocalItems: function (conf, opts) {
        const handler = new LocalContents(conf, opts.keepEmptyFolders);

        return new LocalTraversal(
            conf.PLAYCANVAS_TARGET_DIR,
            handler
        ).run();
    }
};

module.exports = CacheUtils;
