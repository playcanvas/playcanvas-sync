#!/usr/bin/env node

const OverwriteAllLocalWithRemote = require('../src/sync-commands/overwrite-all-local-with-remote.js');
const OverwriteAllRemoteWithLocal = require('../src/sync-commands/overwrite-all-remote-with-local.js');
const CUtils = require('../src/utils/common-utils.js');
const SyncUtils = require('../src/sync-commands/sync-utils.js');
const SCUtils = require('../src/sync-commands/sync-command-utils.js');

const program = require('commander');

program
    .command('diffAll')
    .description('compare all local and remote files and folders')
    .option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
    .option('-e, --ext <extensions>', 'handle files with provided extensions')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runCompAll);

program
    .command('diff <filePath>')
    .description('show line-by-line diff of the remote and local files at filePath')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runDiff);

program
    .command('pullAll')
    .description('download all remote files, overwriting their local counterparts')
    .option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
    .option('-e, --ext <extensions>', 'handle files with provided extensions')
    .option('-y, --yes', 'Automatically answer "yes" to any prompts that might print on the command line.')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runOverwriteAllLocal);

program
    .command('pushAll')
    .description('upload all local files, overwriting their remote counterparts')
    .option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
    .option('-e, --ext <extensions>', 'handle files with provided extensions')
    .option('-y, --yes', 'Automatically answer "yes" to any prompts that might print on the command line.')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runOverwriteAllRemote);

program
    .command('pull <filePath>')
    .description('download remote file, creating local folders if needed')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runDownloadSingle);

program
    .command('push <filePath>')
    .description('upload local file, creating remote folders if needed')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runUploadSingle);

program
    .command('rename <oldPath> <newPath>')
    .description('rename remote file or folder, change its parent folder if needed')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runRename);

program
    .command('rm <filePath>')
    .description('remove remote file or folder')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runDelete);

program
    .command('parseIgnore')
    .description('list assets matched by pcignore.txt')
    .option('-p, --profile <profile>', 'Use the profile specified in the config file')
    .action(runParse);

function runCompAll(cmdObj) {
    CUtils.handleForceRegOpts(cmdObj);
    CUtils.handleProfileOpts(cmdObj);
    CUtils.wrapUserErrors(() => {
        return SyncUtils.reportDiffAll();
    });
}

function runDiff(filePath, cmdObj) {
    CUtils.handleProfileOpts(cmdObj);
    CUtils.wrapUserErrors(() => {
        return SCUtils.diffSingleFile(filePath);
    });
}

function runOverwriteAllLocal(cmdObj) {
    CUtils.handleProfileOpts(cmdObj);
    CUtils.handleForceRegOpts(cmdObj);

    const cb = function () {
        return new OverwriteAllLocalWithRemote().run();
    };

    return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
}

function runOverwriteAllRemote(cmdObj) {
    CUtils.handleProfileOpts(cmdObj);
    CUtils.handleForceRegOpts(cmdObj);

    const cb = function () {
        return new OverwriteAllRemoteWithLocal().run();
    };

    return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
}

function runDownloadSingle(filePath, cmdObj) {
    CUtils.handleProfileOpts(cmdObj);
    CUtils.setForceEnv(filePath);

    CUtils.wrapUserErrors(() => {
        return SCUtils.downloadSingleFile(filePath);
    });
}

function runUploadSingle(filePath, cmdObj) {
    CUtils.handleProfileOpts(cmdObj);
    CUtils.setForceEnv(filePath);

    CUtils.wrapUserErrors(() => {
        return SCUtils.uploadSingleFile(filePath);
    });
}

function runRename(oldPath, newPath, cmdObj) {
    CUtils.handleProfileOpts(cmdObj);
    CUtils.wrapUserErrors(() => {
        return SCUtils.renameItem(oldPath, newPath);
    });
}

function runDelete(filePath, cmdObj) {
    CUtils.handleProfileOpts(cmdObj);
    CUtils.setForceEnv(filePath);

    CUtils.wrapUserErrors(() => {
        return SCUtils.deleteItem(filePath);
    });
}

function runParse() {
    CUtils.wrapUserErrors(() => {
        return SCUtils.reportIgnoredAssets();
    });
}

program.parse(process.argv);
