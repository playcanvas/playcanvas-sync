const fs = require('fs');
const CUtils = require('../utils/common-utils.js');

class ActionCreated {
    constructor(data, conf) {
        this.data = data;

        this.conf = conf;
    }

    async run() {
        this.parentId = this.data.parentRemote &&
        this.conf.store.getAssetId(this.data.parentRemote);

        const response = await this.createRemote();

        const asset = JSON.parse(response);

        this.conf.store.handleAddedAsset(asset);

        return asset.id;
    }

    createRemote() {
        if (this.data.isFile) {
            return this.createFile();

        } else if (this.data.isDirectory) {
            return this.createDirectory();
        }
    }

    createFile() {
        const h = { preload: 'true' };

        if (this.conf.PLAYCANVAS_CONVERT_TO_POW2 !== undefined) {
            h.pow2 = this.conf.PLAYCANVAS_CONVERT_TO_POW2 ? 'true' : 'false';
        }

        return this.callApi(h, this.data.fullPath);
    }

    createDirectory() {
        const h = { type: 'folder' };

        return this.callApi(h, null);
    }

    callApi(opts, srcPath) {
        const h = {
            name: this.data.itemName,
            projectId: this.conf.PLAYCANVAS_PROJECT_ID,
            branchId: this.conf.PLAYCANVAS_BRANCH_ID
        };

        Object.assign(h, opts);

        CUtils.addKeyVal(h, 'parent', this.parentId);

        if (srcPath) {
            h.file = fs.createReadStream(srcPath);
        }

        return this.conf.client.postForm('/assets', h);
    }
}

module.exports = ActionCreated;
