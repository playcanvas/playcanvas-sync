const path = require('path');
const CUtils = require('../utils/common-utils');

const NO_PARENT_TOKEN = 'null';

class ActionRenamed {
    constructor(data, conf) {
        this.data = data;

        this.conf = conf;
    }

    async run() {
        this.init();

        await this.callApi();

        return this.assetId;
    }

    init() {
        this.assetId = CUtils.getAssetId(this.data.fullOldPath, this.conf);

        this.parentId = CUtils.getAssetId(this.data.newDirectory, this.conf);
    }

    callApi() {
        const url = `/assets/${this.assetId}`;

        const h = {
            branchId: this.conf.PLAYCANVAS_BRANCH_ID,
            name: this.data.newFileName,
            parent: this.parentId || NO_PARENT_TOKEN
        };

        return this.conf.client.putForm(url, h);
    }
}

module.exports = ActionRenamed;
