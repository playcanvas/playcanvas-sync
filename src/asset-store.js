const CacheUtils = require('./utils/cache-utils.js');
const CUtils = require('./utils/common-utils.js');
const TypeUtils = require('./utils/type-utils.js');

class AssetStore {
    constructor(conf) {
        this.conf = conf;

        this.idToAsset = {};

        this.pathToAsset = {}; // no leading slash

        this.idToPath = {};

        this.activeAssets = [];

        this.folderAssets = [];

        this.foldersWithActive = {};
    }

    async populate() {
        this.allAssets = await CacheUtils.getCached(this.conf, 'remote_assets');

        this.allAssets.forEach(this.addToIds, this);

        this.allAssets.forEach(this.addToPaths, this);

        this.allAssets.forEach(this.addToActive, this);

        this.allAssets.forEach(this.checkAddFolder, this);

        return this;
    }

    getAssetId(remotePath) {
        const a = this.getAssetAtPath(remotePath);

        return a.id;
    }

    getAssetAtPath(remotePath) {
        return this.pathToAsset[remotePath] ||
            CUtils.throwUsError(`Could not find asset at ${remotePath}`);
    }

    handleAddedAsset(h) {
        this.assertNew(h.id);

        this.allAssets.push(h);

        this.addToIds(h);

        this.addToPaths(h);

        this.addToActive(h);

        this.addToFolder(h);
    }

    handleDeletedAsset(id) {
        this.allAssets = CUtils.rmObjById(this.allAssets, id);

        this.activeAssets = CUtils.rmObjById(this.activeAssets, id);

        this.folderAssets = CUtils.rmObjById(this.folderAssets, id);

        delete this.idToAsset[id];

        const p = this.idToPath[id];

        delete this.idToPath[id];

        delete this.pathToAsset[p];
    }

    addToIds(h) {
        this.idToAsset[h.id] = h;
    }

    addToPaths(h) {
        const p = CUtils.assetPathStr(h, this.idToAsset);

        h.remotePath = p;

        this.pathToAsset[p] = h;

        this.idToPath[h.id] = p;
    }

    addToActive(h) {
        if (TypeUtils.isActiveAsset(h, this.conf)) {
            this.activeAssets.push(h);

            CUtils.addPathToFolders(h, this.idToAsset, this.foldersWithActive);
        }
    }

    checkAddFolder(h) {
        const shouldAdd = h.type === 'folder' &&
            this.foldersWithActive[h.id];

        if (shouldAdd) {
            this.addToFolder(h);
        }
    }

    addToFolder(h) {
        this.folderAssets.push(h);
    }

    assertNew(id) {
        if (this.idToAsset[id]) {
            CUtils.throwUsError(`Asset with id ${id} already exists`);
        }
    }
}

module.exports = AssetStore;
