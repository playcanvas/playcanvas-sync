const CUtils = require('../utils/common-utils');
const GetConfig = require('../utils/get-config');
const ComputeDiffAll = require('./compute-diff-all');

class OverwriteAllLocalWithRemote {
    constructor(limitToItems) {
        this.limitToItems = limitToItems;

        // According to https://developer.playcanvas.com/en/user-manual/api/#rate-limiting
        // the rate limit is 120 requests per minute, so we set it to 100 (it is safe)
        const concurrency = 4;
        const rateLimit = 100;
        this.asyncPool = new CUtils.getAsyncPool(concurrency, rateLimit);
    }

    async run() {
        await this.init();

        this.handleAllFolders();

        await this.handleAllFiles();

        if (!this.doneAnyting) {
            console.log('Nothing done');
        }
    }

    async init() {
        this.conf = await new GetConfig().run();

        this.diff = await new ComputeDiffAll(this.limitToItems).run();
    }

    handleAllFolders() {
        CUtils.sortByStrField(this.diff.extraItems.remote.folders, 'remotePath');

        this.diff.extraItems.remote.folders.forEach((h) => {
            CUtils.makeLocalFolder(h, this.conf);

            this.actionEnd('Created', h);
        });
    }

    async handleAllFiles() {
        for (const h of this.diff.filesThatDiffer) {
            this.asyncPool.add(() => this.fetchFile(h, "Updated"));
        }

        for (const h of this.diff.extraItems.remote.files) {
            this.asyncPool.add(() => this.fetchFile(h, "Created"));
        }
    }

    async fetchFile(h, action) {
        const asset = this.conf.store.pathToAsset[h.remotePath];

        await this.conf.client.loadAssetToFile(asset, this.conf);

        this.actionEnd(action, h);
    }

    actionEnd(action, h) {
        this.doneAnyting = true;

        console.log(`${action} ${h.remotePath}`);
    }
}

module.exports = OverwriteAllLocalWithRemote;
