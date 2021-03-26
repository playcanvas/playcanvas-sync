const LoadAssets = require('../load-assets');
const LocalContents = require('./local-contents');
const LocalTraversal = require('./local-traversal');

const CacheUtils = {
    cachedData: {},

    getCached: async function(conf, type) {
        if (!CacheUtils.cachedData[type]) {
            CacheUtils.cachedData[type] = await CacheUtils.loadData(conf, type);
        }

        return CacheUtils.cachedData[type];
    },

    loadData: function(conf, type) {
        if (type === 'remote_assets') {
            return new LoadAssets(conf).run();

        } else if (type === 'local_items') {
            return CacheUtils.loadLocalItems(conf);
        }
    },

    loadLocalItems: function (conf) {
        const needEmtpy = conf.OPERATION_TYPE === 'overwrite_all_local';

        const handler = new LocalContents(conf, needEmtpy);

        return new LocalTraversal(
            conf.PLAYCANVAS_TARGET_DIR,
            handler
        ).run();
    }
};

module.exports = CacheUtils;
