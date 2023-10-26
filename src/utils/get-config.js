const ApiClient = require('../api-client.js');
const AssetStore = require('../asset-store.js');
const CUtils = require('./common-utils.js');
const ConfigVars = require('./config-vars.js');
const path = require('path');
const PcignoreParser = require('./pcignore-parser.js');
const DummyIgnoreParser = require('./dummy-ignore-parser.js');

const PCIGNORE_FILE = 'pcignore.txt';

class GetConfig {
    async run() {
        this.result = await newConfigVars().run();

        this.setClient();

        await this.result.client.fetchLimits();

        await this.checkBranchMatch();

        this.setParser();

        await this.setStore();

        return this.result;
    }

    setClient() {
        this.result.client = newApiClient(
            this.result.PLAYCANVAS_BASE_URL,
            this.result.PLAYCANVAS_API_KEY
        );
    }

    setParser() {
        const p = path.join(this.result.PLAYCANVAS_TARGET_DIR, PCIGNORE_FILE);

        const s = CUtils.fileToStr(p);

        this.result.ignParser = s ?
            newPcignoreParser(s, [PCIGNORE_FILE], this.result.PLAYCANVAS_INCLUDE_REG).parse() :
            newDummyIgnoreParser();
    }

    async setStore() {
        this.result.store = await newAssetStore(this.result).populate();
    }

    async checkBranchMatch() {
        const id = await this.getUserBranch();

        if (id !== this.result.PLAYCANVAS_BRANCH_ID) {
            CUtils.throwFtError('Provided branch id does not match your current PlayCanvas branch');
        }
    }

    async getUserBranch() {
        try {
            const h = await this.result.client.getCurEditorBranch(this.result.PLAYCANVAS_PROJECT_ID);

            return h.id;

        } catch (e) {
            console.log(e.message);

            CUtils.throwFtError('Failed to retrieve your current PlayCanvas branch. Use your personal api token');
        }
    }
}

module.exports = GetConfig;
