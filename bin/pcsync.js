#!/usr/bin/env node

import { Command } from 'commander';

import OverwriteAllLocalWithRemote from '../src/sync-commands/overwrite-all-local-with-remote.js';
import OverwriteAllRemoteWithLocal from '../src/sync-commands/overwrite-all-remote-with-local.js';
import SCUtils from '../src/sync-commands/sync-command-utils.js';
import SyncUtils from '../src/sync-commands/sync-utils.js';
import CUtils from '../src/utils/common-utils.js';

const program = new Command();


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
.option('-y, --yes', 'Automatically answer "yes" to any prompts that might print on the command line.')
.action(runOverwriteAllLocal);

program
.command('pushAll')
.description('upload all local files, overwriting their remote counterparts')
.option('-r, --regexp <regexp>', 'handle files matching the provided regular expression')
.option('-e, --ext <extensions>', 'handle files with provided extensions')
.option('-y, --yes', 'Automatically answer "yes" to any prompts that might print on the command line.')
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

function runCompAll(cmdObj) {
    CUtils.handleForceRegOpts(cmdObj);

    CUtils.wrapUserErrors(() => {
        return SyncUtils.reportDiffAll();
    });
}

function runDiff(filePath) {
    CUtils.wrapUserErrors(() => {
        return SCUtils.diffSingleFile(filePath);
    });
}

function runOverwriteAllLocal(cmdObj) {
    CUtils.handleForceRegOpts(cmdObj);

    const cb = function () {
        return new OverwriteAllLocalWithRemote().run();
    };

    return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
}

function runOverwriteAllRemote(cmdObj) {
    CUtils.handleForceRegOpts(cmdObj);

    const cb = function () {
        return new OverwriteAllRemoteWithLocal().run();
    };

    return cmdObj.yes ? cb() : SyncUtils.compareAndPrompt(cb);
}

function runDownloadSingle(filePath) {
    CUtils.setForceEnv(filePath);

    CUtils.wrapUserErrors(() => {
        return SCUtils.downloadSingleFile(filePath);
    });
}

function runUploadSingle(filePath) {
    CUtils.setForceEnv(filePath);

    CUtils.wrapUserErrors(() => {
        return SCUtils.uploadSingleFile(filePath);
    });
}

function runRename(oldPath, newPath) {
    CUtils.wrapUserErrors(() => {
        return SCUtils.renameItem(oldPath, newPath);
    });
}

function runDelete(filePath) {
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
