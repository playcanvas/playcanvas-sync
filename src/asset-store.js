const CUtils = require('./utils/common-utils');
const TypeUtils = require('./utils/type-utils');
const CacheUtils = require('./utils/cache-utils');

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
        this.allAssets = await CacheUtils.fetchAssets(this.conf);

        this.allAssets.forEach(this.addToIds, this);

        this.allAssets.forEach(this.addToPaths, this);

        this.allAssets.forEach(this.addToActive, this);

        this.allAssets.forEach(this.checkAddFolder, this);

        return this;
    }

    getAssetAtPath(p) {
        const asset = this.pathToAsset[p];

        if (asset) {
            return asset;
        } else {
            CUtils.throwUserError(`Could not find asset at ${p}`);
        }
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

    handleRenamedAsset(id, name, parent) {
        const a = this.idToAsset[id];

        a.name = name;

        a.parent = parent;

        const oldPath = this.idToPath[id];

        delete this.pathToAsset[oldPath];

        const newPath = CUtils.assetPathStr(a, this.idToAsset);

        this.idToAsset[id].remotePath = newPath;

        this.idToPath[id] = newPath;

        this.pathToAsset[newPath] = a;
    }

    updateAllPaths() {
        this.allAssets.forEach(h => this.handleRenamedAsset(h.id, h.name, h.parent));
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
            (this.foldersWithActive[h.id] ||
                CUtils.isOperationType('overwrite_remote'));

        if (shouldAdd) {
            this.addToFolder(h);
        }
    }

    addToFolder(h) {
        this.folderAssets.push(h);
    }

    assertNew(id) {
        if (this.idToAsset[id]) {
            CUtils.throwUserError(`Asset with id ${id} already exists`);
        }
    }
}

module.exports = AssetStore;
