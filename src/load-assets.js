const CUtils = require('./utils/common-utils');

const ASSET_QRY_LIMIT = 100000;

class LoadAssets {
    constructor(conf) {
        this.conf = conf;

        this.skip = 0;

        this.result = [];
    }

    async run() {
        while (this.souldContinue()) {
            await this.callApi();
        }

        return this.result;
    }

    souldContinue() {
        return this.dbTotal === undefined ||
      this.result.length < this.dbTotal;
    }

    async callApi() {
        const h = await this.conf.client.fetchAssets(
            this.conf.PLAYCANVAS_PROJECT_ID,
            this.conf.PLAYCANVAS_BRANCH_ID,
            this.skip,
            ASSET_QRY_LIMIT
        );

        CUtils.pushArToAr(this.result, h.result);

        this.skip += ASSET_QRY_LIMIT;

        this.dbTotal = h.pagination.total;
    }
}

module.exports = LoadAssets;
