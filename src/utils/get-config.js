import path from 'path';

import ApiClient from '../api-client.js';
import AssetStore from '../asset-store.js';
import CUtils from './common-utils.js';
import ConfigVars from './config-vars.js';
import DummyIgnoreParser from './dummy-ignore-parser.js';
import PcignoreParser from './pcignore-parser.js';

const PCIGNORE_FILE = 'pcignore.txt';

class GetConfig {
    async run() {
        this.result = await new ConfigVars().run();

        this.setClient();

        await this.result.client.fetchLimits();

        await this.checkBranchMatch();

        this.setParser();

        await this.setStore();

        return this.result;
    }

    setClient() {
        this.result.client = new ApiClient(
            this.result.PLAYCANVAS_BASE_URL,
            this.result.PLAYCANVAS_API_KEY
        );
    }

    setParser() {
        const p = path.join(this.result.PLAYCANVAS_TARGET_DIR, PCIGNORE_FILE);

        const s = CUtils.fileToStr(p);

        this.result.ignParser = s ?
            new PcignoreParser(s, [PCIGNORE_FILE], this.result.PLAYCANVAS_INCLUDE_REG).parse() :
            new DummyIgnoreParser();
    }

    async setStore() {
        this.result.store = await new AssetStore(this.result).populate();
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

export default GetConfig;
