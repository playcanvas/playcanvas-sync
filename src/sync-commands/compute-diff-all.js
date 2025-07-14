const GetConfig = require('../utils/get-config.js');
const CUtils = require('../utils/common-utils.js');
const CacheUtils = require('../utils/cache-utils.js');
const path = require('path');
const fs = require('fs');

class ComputeDiffAll {
    constructor(limitToItems) {
        this.limitToItems = limitToItems;

        this.commonPaths = {
            folders: {},
            files: {}
        };

        this.res = {
            filesThatDiffer: [],

            equalItems: {
                files: [],
                folders: []
            },

            extraItems: {
                remote: {
                    files: [],
                    folders: []
                },
                local: {
                    files: [],
                    folders: []
                }
            }
        };
    }

    async run() {
        await this.init();

        this.handleAllFolders();

        await this.handleAllFiles();

        this.setAnyDiffFound();

        return this.res;
    }

    async init() {
        this.conf = await new GetConfig().run();

        this.remote = {
            folders: this.conf.store.folderAssets,
            files: this.conf.store.activeAssets
        };

        this.local = await CacheUtils.getCached(this.conf, 'local_items');

        this.applyLimit();
    }

    applyLimit() {
        if (this.limitToItems) {
            CUtils.applyItemLimit(this.remote, this.limitToItems);

            CUtils.applyItemLimit(this.local, this.limitToItems);
        }
    }

    handleAllFolders() {
        const h = CUtils.partitionFolders(this.local.folders, this.conf);

        this.res.equalItems.folders = h.isOnRemote;

        this.res.extraItems.local.folders = h.isNotOnRemote;

        this.addToCommonPaths(h.isOnRemote, 'folders');

        this.selectRemoteOnly('folders');
    }

    async handleAllFiles() {
        const promises = this.local.files.map(this.handleLocalFile, this);

        await Promise.all(promises);

        this.selectRemoteOnly('files');
    }

    handleLocalFile(h) {
        return CUtils.isItemOnRemote(h, this.conf) ?
            this.handleFileOnBoth(h) :
            this.res.extraItems.local.files.push(h);
    }

    async handleFileOnBoth(h) {
        this.addToCommonPaths([h], 'files');

        const filesEqual = await CUtils.sameHashAsRemote(h, this.conf);

        const dst = filesEqual ? this.res.equalItems.files : this.res.filesThatDiffer;

        dst.push(h);
    }

    selectRemoteOnly(field) {
        this.res.extraItems.remote[field] = this.remote[field].filter((h) => {
            // First check if the file exists locally (original logic)
            if (this.commonPaths[field][h.remotePath]) {
                return false;
            }

            // For files, check if they can actually be downloaded
            if (field === 'files') {
                return this.canDownloadFile(h);
            }

            return true;
        });
    }

    canDownloadFile(h) {
        // Skip assets that don't have downloadable files (folders, containers, etc.)
        if (h.type === 'folder' || !h.file) {
            return false;
        }

        // Check if downloading this file would cause a path conflict
        if (this.wouldCausePathConflict(h)) {
            return false;
        }

        return true;
    }

    wouldCausePathConflict(h) {
        // Get the full local path where this file would be saved
        const fullPath = CUtils.assetToFullPath(h, this.conf);
        const dir = path.dirname(fullPath);

        // Check if the immediate parent directory is actually a file
        if (fs.existsSync(dir)) {
            const stat = fs.statSync(dir);
            if (stat.isFile()) {
                return true;
            }
        }

        // Check if any parent directory in the path is actually a file
        const pathParts = dir.split(path.sep);
        let currentPath = '';

        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === '') {
                currentPath = path.sep; // Handle root path
                continue;
            }

            currentPath = currentPath === path.sep ?
                path.join(currentPath, pathParts[i]) :
                path.join(currentPath, pathParts[i]);

            if (fs.existsSync(currentPath)) {
                const stat = fs.statSync(currentPath);
                if (stat.isFile()) {
                    return true;
                }
            }
        }

        return false;
    }

    addToCommonPaths(a, field) {
        a.forEach((h) => {
            this.commonPaths[field][h.remotePath] = 1;
        });
    }

    setAnyDiffFound() {
        const allResArrays = [
            this.res.filesThatDiffer,
            this.res.extraItems.local.files,
            this.res.extraItems.remote.files
        ];

        this.res.anyDiffFound = allResArrays.some(a => a.length);
    }
}

module.exports = ComputeDiffAll;
