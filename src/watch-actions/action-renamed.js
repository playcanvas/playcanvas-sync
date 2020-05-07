const path = require('path');
const CUtils = require('../utils/common-utils');

const NO_PARENT_TOKEN = 'null';

class ActionRenamed {
    constructor(event, conf) {
        this.event = event;

        this.conf = conf;
    }

    async run() {
        this.init();

        await this.callApi();

        this.updateStore();

        return this.assetId;
    }

    init() {
        this.newName = this.event.newFile;

        const fullOldPath = path.join(this.event.directory, this.event.oldFile);

        this.assetId = CUtils.getAssetId(fullOldPath, this.conf);

        this.parentId = CUtils.getAssetId(this.event.newDirectory, this.conf);
    }

    callApi() {
        const url = `/assets/${this.assetId}`;

        const h = {
            branchId: this.conf.PLAYCANVAS_BRANCH_ID,
            name: this.newName,
            parent: this.parentId || NO_PARENT_TOKEN
        };

        return this.conf.client.putForm(url, h);
    }

    updateStore() {
        this.conf.store.handleRenamedAsset(this.assetId, this.newName, this.parentId);

        if (this.event.isDirEvent) {
            this.conf.store.updateAllPaths();
        }
    }
}

module.exports = ActionRenamed;
