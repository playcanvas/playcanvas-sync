const CUtils = require('../utils/common-utils');
const ComputeDiffAll = require('./compute-diff-all');

class OverwriteAllLocalWithRemote {
    constructor(limitToItems) {
        this.limitToItems = limitToItems;
    }

    async run() {
        await this.init();

        this.handleAllFolders();

        await this.handleAllFiles();
    }

    async init() {
        CUtils.setOperationType('overwrite_local');

        this.diff = await new ComputeDiffAll(this.limitToItems).run();

        this.conf = this.diff.conf;
    }

    async handleAllFolders() {
        CUtils.sortByStrField(this.diff.extraItems.remote.folders, 'remotePath');

        this.diff.extraItems.remote.folders.forEach(h => {
            CUtils.makeLocalFolder(h, this.conf);

            CUtils.syncMsg(`Created ${h.remotePath}`);
        });
    }

    handleAllFiles() {
        const promises1 = this.diff.filesThatDiffer.map(h => this.fetchFile(h, 'Updated'));

        const promises2 = this.diff.extraItems.remote.files.map(h => this.fetchFile(h, 'Created'));

        return Promise.all(promises1.concat(promises2));
    }

    async fetchFile(h, action) {
        const asset = this.conf.store.pathToAsset[h.remotePath];

        await this.conf.client.loadAssetToFile(asset, this.conf);

        CUtils.syncMsg(`${action} ${h.remotePath}`);
    }
}

module.exports = OverwriteAllLocalWithRemote;
