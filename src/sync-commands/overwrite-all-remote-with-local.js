const ActionCreated = require('../watch-actions/action-created');
const WatchUtils = require('../watch-actions/watch-utils');
const ComputeDiffAll = require('./compute-diff-all');
const GetConfig = require('../utils/get-config');
const CUtils = require('../utils/common-utils');

class OverwriteAllRemoteWithLocal {
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

        await this.handleAllFolders();

        await this.handleAllFiles();

        if (!this.doneAnyting) {
            console.log('Nothing done');
        }
    }

    async init() {
        this.conf = await new GetConfig().run();

        this.diff = await new ComputeDiffAll(this.limitToItems).run();
    }

    async handleAllFolders() {
        for (const h of this.diff.extraItems.local.folders) {
            await this.createItem(h); // parents before children
        }
    }

    async handleAllFiles() {
        for (const h of this.diff.filesThatDiffer) {
            this.asyncPool.add(() => this.updateItem(h));
        }

        for (const h of this.diff.extraItems.local.files) {
            this.asyncPool.add(() => this.createItem(h));
        }
    }

    async createItem(h) {
        await new ActionCreated(h, this.conf).run();

        this.actionEnd('Created', h);
    }

    async updateItem(h) {
        await WatchUtils.actionModified(h, this.conf);

        this.actionEnd('Updated', h);
    }

    actionEnd(action, h) {
        this.doneAnyting = true;

        console.log(`${action} ${h.remotePath}`);
    }
}

module.exports = OverwriteAllRemoteWithLocal;
