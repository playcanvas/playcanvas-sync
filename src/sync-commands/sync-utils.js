const CUtils = require('../utils/common-utils');
const ComputeDiffAll = require('./compute-diff-all');
const readline = require('readline');
const FindProcess = require('find-process');
const path = require('path');
const GetConfig = require('../utils/get-config');

const SyncUtils = {
    reportDiffAll: async function() {
        const h = await new ComputeDiffAll().run();

        SyncUtils.reportList(h.filesThatDiffer, 'Files that Differ');

        SyncUtils.reportList(h.extraItems.local.files, 'Local Files Missing on Remote');

        SyncUtils.reportList(h.extraItems.remote.files, 'Remote Files Missing on Local');

        return h;
    },

    reportList: function (a, tag) {
        if (a.length) {
            console.log(`---- ${tag} ----`);

            a = a.map(h => h.remotePath);

            a.sort();

            a.forEach(s => console.log(s));
        }
    },

    compareAndPrompt: async function(callback) {
        const h = await CUtils.wrapUserErrors(SyncUtils.reportDiffAll);

        h.anyDiffFound ?
            SyncUtils.promptAndRun(callback) :
            console.log('No differences found between local and remote.');
    },

    promptAndRun: function(callback) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Proceed? [y/n] ', (answer) => {
            rl.close();

            if (answer === 'y') {
                CUtils.wrapUserErrors(callback);
            } else {
                process.exit(0);
            }
        });
    },

    remoteFileStr: async function (remotePath, conf) {
        const asset = conf.store.getAssetAtPath(remotePath);

        const s = await conf.client.loadAssetToStr(asset, conf.PLAYCANVAS_BRANCH_ID);

        return CUtils.replaceCarriage(s);
    },

    localFileStr: function (remotePath, conf) {
        const p = path.join(conf.PLAYCANVAS_TARGET_DIR, remotePath);

        const s = CUtils.fileToStr(p);

        if (!s) {
            CUtils.throwUsError(`Could not find local file ${p}`);
        }

        return s;
    },

    errorIfDifferent: async function(canForce) {
        const h = await SyncUtils.reportDiffAll();

        if (h.anyDiffFound) {
            const s = 'Differences found between local and remote. ' +
                'Use \'pcsync\' to fix' +
                SyncUtils.forceMsg(canForce);

            CUtils.throwFtError(s);
        }
    },

    errorIfMultWatch: async function() {
        const a = await SyncUtils.getWatchProcs();

        if (a.length > 1) { // 1 (this process) is expected
            const s = 'Other running instances of \'pcwatch\' detected. Stop them' +
                SyncUtils.forceMsg(true);

            CUtils.throwFtError(s);
        }
    },

    getWatchProcs: async function() {
        const conf = await new GetConfig().run();

        const a = await FindProcess('name', /pcwatch/);

        if (conf.PLAYCANVAS_VERBOSE) {
            console.log(a);
        }

        return a.filter(h => h.name !== 'winpty.exe'); // git bash on wind
    },

    forceMsg: function (canForce) {
        return canForce ? ' or use \'--force\' to skip this check' : '';
    }
};

module.exports = SyncUtils;
