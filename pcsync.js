#!/usr/bin/env node

const OverwriteAllLocalWithRemote = require('./src/sync-commands/overwrite-all-local-with-remote');
const OverwriteAllRemoteWithLocal = require('./src/sync-commands/overwrite-all-remote-with-local');
const CUtils = require('./src/utils/common-utils');
const SyncUtils = require('./src/sync-commands/sync-utils');
const SCUtils = require('./src/sync-commands/sync-command-utils');

const program = require('commander');

program
    .command('diffAll')
    .description('compare all local and remote files and folders')
    .option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
    .option('-e, --ext <extensions>', 'handle files with provided extensions')
    .action(runCompAll);

program
    .command('diff <filePath>')
    .description('show line-by-line diff of the remote and local files at filePath')
    .action(runDiff);

program
    .command('pullAll')
    .description('download all remote files, overwriting their local counterparts')
    .option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
    .option('-e, --ext <extensions>', 'handle files with provided extensions')
    .action(runOverwriteAllLocal);

program
    .command('pushAll')
    .description('upload all local files, overwriting their remote counterparts')
    .option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
    .option('-e, --ext <extensions>', 'handle files with provided extensions')
    .action(runOverwriteAllRemote);

program
    .command('pull <filePath>')
    .description('download remote file, creating local folders if needed')
    .action(runDownloadSingle);

program
    .command('push <filePath>')
    .description('upload local file, creating remote folders if needed')
    .action(runUploadSingle);

program
    .command('rename <oldPath> <newPath>')
    .description('rename remote file or folder, change its parent folder if needed')
    .action(runRename);

program
    .command('rm <filePath>')
    .description('remove remote file or folder')
    .action(runDelete);

program
    .command('parseIgnore')
    .description('list assets matched by pcignore.txt')
    .action(runParse);

function runCompAll (cmdObj) {
    CUtils.handleForceRegOpts(cmdObj);

    CUtils.wrapUsErrors(() => {
        return SyncUtils.reportDiffAll();
    });
}

function runDiff (filePath) {
    CUtils.wrapUsErrors(() => {
        return SCUtils.diffSingleFile(filePath);
    });
}

function runOverwriteAllLocal (cmdObj) {
    CUtils.handleForceRegOpts(cmdObj);

    SyncUtils.compareAndPrompt(() => {
        return new OverwriteAllLocalWithRemote().run();
    });
}

function runOverwriteAllRemote (cmdObj) {
    CUtils.handleForceRegOpts(cmdObj);

    SyncUtils.compareAndPrompt(() => {
        return new OverwriteAllRemoteWithLocal().run();
    });
}

function runDownloadSingle (filePath) {
    CUtils.setForceEnv(filePath);

    CUtils.wrapUsErrors(() => {
        return SCUtils.downloadSingleFile(filePath);
    });
}

function runUploadSingle (filePath) {
    CUtils.setForceEnv(filePath);

    CUtils.wrapUsErrors(() => {
        return SCUtils.uploadSingleFile(filePath);
    });
}

function runRename (oldPath, newPath) {
    CUtils.wrapUsErrors(() => {
        return SCUtils.renameItem(oldPath, newPath);
    });
}

function runDelete (filePath) {
    CUtils.setForceEnv(filePath);

    CUtils.wrapUsErrors(() => {
        return SCUtils.deleteItem(filePath);
    });
}

function runParse () {
    CUtils.wrapUsErrors(() => {
        return SCUtils.reportIgnoredAssets();
    });
}

program.parse(process.argv);
