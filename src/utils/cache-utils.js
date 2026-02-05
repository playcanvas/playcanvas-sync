import LoadAssets from '../load-assets.js';
import LocalContents from './local-contents.js';
import LocalTraversal from './local-traversal.js';

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
            return new LoadAssets(conf).run();

        } else if (type === 'local_items') {
            return CacheUtils.loadLocalItems(conf);
        }
    },

    loadLocalItems: function (conf) {
        const handler = new LocalContents(conf);

        return new LocalTraversal(
            conf.PLAYCANVAS_TARGET_DIR,
            handler
        ).run();
    }
};

export default CacheUtils;
