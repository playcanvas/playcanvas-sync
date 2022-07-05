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
        this.assetId = this.conf.store.getAssetId(this.data.remoteOldPath);

        this.parentId = this.data.remoteNewDir ?
            this.conf.store.getAssetId(this.data.remoteNewDir) :
            NO_PARENT_TOKEN;
    }

    callApi() {
        const url = `/assets/${this.assetId}`;

        const h = {
            branchId: this.conf.PLAYCANVAS_BRANCH_ID,
            name: this.data.newFileName,
            parent: this.parentId
        };

        return this.conf.client.putForm(url, h);
    }
}

module.exports = ActionRenamed;
