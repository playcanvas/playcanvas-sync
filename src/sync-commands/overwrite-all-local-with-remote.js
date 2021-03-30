const CUtils = require('../utils/common-utils');
const GetConfig = require('../utils/get-config');
const ComputeDiffAll = require('./compute-diff-all');

class OverwriteAllLocalWithRemote {
    constructor(limitToItems) {
        this.limitToItems = limitToItems;
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

        this.diff.extraItems.remote.folders.forEach(h => {
            CUtils.makeLocalFolder(h, this.conf);

            this.actionEnd('Created', h);
        });
    }

    async handleAllFiles() {
        for (const h of this.diff.filesThatDiffer) {
            await this.fetchFile(h, 'Updated');
        }

        for (const h of this.diff.extraItems.remote.files) {
            await this.fetchFile(h, 'Created');
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
