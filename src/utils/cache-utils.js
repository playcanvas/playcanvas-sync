const LoadAssets = require('../load-assets');
const DirContents = require('./dir-contents');

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
            return new DirContents(conf).run();
        }
    }
};

module.exports = CacheUtils;
