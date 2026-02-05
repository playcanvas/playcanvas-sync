import CacheUtils from '../utils/cache-utils.js';
import CUtils from '../utils/common-utils.js';
import GetConfig from '../utils/get-config.js';

class ComputeDiffAll {
    constructor(limitToItems) {
        this.limitToItems = limitToItems;

        this.commonPaths = {
            folders: {},
            files: {}
        };

        this.res = {
            filesThatDiffer: [],

            equalItems: {
                files: [],
                folders: []
            },

            extraItems: {
                remote: {
                    files: [],
                    folders: []
                },
                local: {
                    files: [],
                    folders: []
                }
            }
        };
    }

    async run() {
        await this.init();

        this.handleAllFolders();

        await this.handleAllFiles();

        this.setAnyDiffFound();

        return this.res;
    }

    async init() {
        this.conf = await new GetConfig().run();

        this.remote = {
            folders: this.conf.store.folderAssets,
            files: this.conf.store.activeAssets
        };

        this.local = await CacheUtils.getCached(this.conf, 'local_items');

        this.applyLimit();
    }

    applyLimit() {
        if (this.limitToItems) {
            CUtils.applyItemLimit(this.remote, this.limitToItems);

            CUtils.applyItemLimit(this.local, this.limitToItems);
        }
    }

    handleAllFolders() {
        const h = CUtils.partitionFolders(this.local.folders, this.conf);

        this.res.equalItems.folders = h.isOnRemote;

        this.res.extraItems.local.folders = h.isNotOnRemote;

        this.addToCommonPaths(h.isOnRemote, 'folders');

        this.selectRemoteOnly('folders');
    }

    async handleAllFiles() {
        const promises = this.local.files.map(this.handleLocalFile, this);

        await Promise.all(promises);

        this.selectRemoteOnly('files');
    }

    handleLocalFile(h) {
        return CUtils.isItemOnRemote(h, this.conf) ?
            this.handleFileOnBoth(h) :
            this.res.extraItems.local.files.push(h);
    }

    async handleFileOnBoth(h) {
        this.addToCommonPaths([h], 'files');

        const filesEqual = await CUtils.sameHashAsRemote(h, this.conf);

        const dst = filesEqual ? this.res.equalItems.files : this.res.filesThatDiffer;

        dst.push(h);
    }

    selectRemoteOnly(field) {
        this.res.extraItems.remote[field] = this.remote[field].filter((h) => {
            return !this.commonPaths[field][h.remotePath];
        });
    }

    addToCommonPaths(a, field) {
        a.forEach((h) => {
            this.commonPaths[field][h.remotePath] = 1;
        });
    }

    setAnyDiffFound() {
        const allResArrays = [
            this.res.filesThatDiffer,
            this.res.extraItems.local.files,
            this.res.extraItems.remote.files
        ];

        this.res.anyDiffFound = allResArrays.some(a => a.length);
    }
}

export default ComputeDiffAll;
