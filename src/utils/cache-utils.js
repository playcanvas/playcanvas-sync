const LoadAssets = require('../load-assets');

const CacheUtils = {
    fetchAssets: async function(conf) {
        if (!CacheUtils.loadedAssets) {
            CacheUtils.loadedAssets = await new LoadAssets(conf).run();
        }

        return CacheUtils.loadedAssets;
    }
};

module.exports = CacheUtils;
