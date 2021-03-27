const CUtils = require('../utils/common-utils');
const ComputeDiffAll = require('./compute-diff-all');
const readline = require('readline');
const FindProcess = require('find-process');
const path = require('path');

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
            CUtils.syncMsg(`---- ${tag} ----`);

            a = a.map(h => h.remotePath);

            a.sort();

            a.forEach(s => CUtils.syncMsg(s));
        }
    },

    reportExistingFolders: function (diff) {
        diff.equalItems.folders.forEach(h => {
            CUtils.syncMsg(`Folder ${h.remotePath} already exists`);
        });
    },

    reportEqualFiles: function (diff) {
        diff.equalItems.files.forEach(h => {
            CUtils.syncMsg(`Local and remote files ${h.remotePath} are equal`);
        });
    },

    compareAndPrompt: async function(callback) {
        const h = await CUtils.wrapUsErrors(SyncUtils.reportDiffAll);

        h.anyDiffFound ?
            SyncUtils.promptAndRun(callback) :
            CUtils.syncMsg('No differences found between local and remote.');
    },

    promptAndRun: function(callback) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Proceed? [y/n] ', (answer) => {
            rl.close();

            if (answer === 'y') {
                CUtils.wrapUsErrors(callback);
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
        const n = await SyncUtils.countWatchInstances();

        if (n > 1) { // 1 (this process) is expected
            const s = 'Other running instances of \'pcwatch\' detected. Stop them' +
                SyncUtils.forceMsg(true);

            CUtils.throwFtError(s);
        }
    },

    countWatchInstances: async function() {
        const a = await FindProcess('name', /pcwatch/);

        return a.length;
    },

    forceMsg: function (canForce) {
        return canForce ? ' or use \'--force\' to skip this check' : '';
    }
};

module.exports = SyncUtils;
