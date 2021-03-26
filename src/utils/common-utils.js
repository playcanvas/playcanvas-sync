const PathUtils = require('./path-utils');
const fs = require('fs');
const crypto = require('crypto');
const UserError = require('./user-error');
const FatalError = require('./fatal-error');
const mkdirp = require('mkdirp');

const HTTPS_PREF_REG = /^https:\/\//;

const CUtils = {
    pushArToAr: function(a1, a2) {
        Array.prototype.push.apply(a1, a2);
    },

    assetPathStr: function (asset, idToAsset) {
        let a = CUtils.assetPathItems(asset, idToAsset);

        a = a.map(h => h.name);

        return PathUtils.arToSlashForwPath(a);
    },

    assetPathItems: function (asset, idToAsset) {
        const a = [];

        while (asset) {
            a.unshift(asset);

            const p = asset.parent;

            asset = p && idToAsset[p];
        }

        return a;
    },

    addPathToFolders: function (asset, idToAsset, dst) {
        let a = CUtils.assetPathItems(asset, idToAsset);

        a = a.slice(0, a.length - 1);

        a.forEach(h => {
            dst[h.id] = 1;
        });
    },

    streamToString: function (stream) {
        const a = [];

        return new Promise((resolve, reject) => {
            stream.on('data', s => a.push(s));

            stream.on('end', () => {
                const s = Buffer.concat(a).toString('utf8');

                resolve(s);
            });

            stream.on('error', reject);
        });
    },

    streamToFile: function (readStream, file) {
        const writeStream = fs.createWriteStream(file);

        readStream.pipe(writeStream);

        return new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
    },

    fileToStr: function(file) {
        if (fs.existsSync(file)) {
            const s = fs.readFileSync(file, 'utf8');

            return CUtils.replaceCarriage(s);

        } else {
            return null;
        }
    },

    replaceCarriage: function (s) { // for windows
        return s.replace(/\r\n?/g, '\n');
    },

    fileToMd5Hash: function(file) {
        const hash = crypto.createHash('md5');

        hash.setDefaultEncoding('latin1');

        const input = fs.createReadStream(file);

        return new Promise((resolve, reject) => {
            input.on('data', s => hash.update(s));

            input.on('end', () => resolve(hash.digest('hex')));

            input.on('error', reject);
        });
    },

    isBadDir: function (s, conf) {
        return conf.PLAYCANVAS_BAD_FOLDER_REG.test(s);
    },

    wrapUserErrors: async function (callback, args) {
        try {
            const res = await callback.apply(null, args);

            return res;

        } catch (e) {
            if (e instanceof UserError) {
                console.log(e.message);

            } else if (e instanceof FatalError) {
                console.log(e.message);
                process.exit(1);

            } else {
                throw e;
            }
        }
    },

    throwUserError: function (msg) {
        throw new UserError('Error: ' + msg);
    },

    throwFatalError: function (msg) {
        throw new FatalError('Fatal Error: ' + msg);
    },

    addKeyVal: function (h, k, v) {
        if (v) {
            h[k] = v;
        }
    },

    rmObjById: function (a, id) {
        return a.filter(h => h.id !== id);
    },

    eventHasAsset: function(e, conf) {
        return conf.store.pathToAsset[e.remotePath];
    },

    makeDirP: function(s) {
        if (!fs.existsSync(s)) {
            mkdirp.sync(s);
        }
    },

    makeLocalFolder: function (folderAsset, conf) {
        const fullPath = CUtils.assetToFullPath(folderAsset, conf);

        CUtils.makeDirP(fullPath);
    },

    assetToFullPath: function (asset, conf) {
        const remotePath = conf.store.idToPath[asset.id];

        return PathUtils.fullPathToLocalFile(conf.PLAYCANVAS_TARGET_DIR, remotePath);
    },

    isItemOnRemote: function (h, conf) {
        return conf.store.pathToAsset[h.remotePath];
    },

    sameHashAsRemote: async function (local, conf) {
        const remote = conf.store.pathToAsset[local.remotePath];

        if (remote) {
            const md5 = await CUtils.fileToMd5Hash(local.fullPath);

            return md5 === remote.file.hash;

        } else {
            return false;
        }
    },

    partitionFolders: function(a, conf) {
        const res = {
            isOnRemote: [],
            isNotOnRemote: []
        };

        a.forEach(h => {
            const field = CUtils.isItemOnRemote(h, conf) ?
                'isOnRemote' :
                'isNotOnRemote';

            res[field].push(h);
        });

        return res;
    },

    syncMsg: function (s) {
        console.log(s);
    },

    watchMsg: function (s) {
        console.log(s);
    },

    configMsg: function (s) {
        console.log(s);
    },

    applyItemLimit: function(data, limit) {
        data.folders = data.folders.filter(h => {
            return limit.folders.includes(h.remotePath);
        });

        data.files = data.files.filter(h => {
            return limit.remotePath === h.remotePath;
        });
    },

    sortByStrField: function (ar, field) {
        ar.sort((a, b) => a[field].localeCompare(b[field]));
    },

    jsonFileToMap: function (p) {
        return fs.existsSync(p) ?
            CUtils.readJson(p) :
            {};
    },

    readJson: function (p) {
        const s = fs.readFileSync(p);

        return JSON.parse(s);
    },

    checkSetEnv: function (k, v) {
        if (v) {
            process.env[k] = v;
        }
    },

    setForceEnv: function(remotePath) {
        let s = PathUtils.rmFirstSlash(remotePath);

        s = CUtils.escapeRegExp(s);

        s = `^${s}$`;

        CUtils.checkSetEnv('PLAYCANVAS_FORCE_REG', s);
    },

    escapeRegExp: function(s) { // from MDN
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    setOperationType: function (v) {
        global.OPERATION_TYPE = v;
    },

    isOperationType: function (v) {
        return global.OPERATION_TYPE === v;
    },

    handleForceRegOpts: function (cmdObj) {
        const v = cmdObj.regexp ||
            (cmdObj.ext && CUtils.extToReg(cmdObj.ext));

        CUtils.checkSetEnv('PLAYCANVAS_FORCE_REG', v);
    },

    extToReg: function (extensions) {
        let a = extensions.split(',');

        a = a.map(s => '\\.' + s);

        const reg = a.join('|');

        return `(${reg})$`;
    },

    checkHttps: function (url) {
        if (!HTTPS_PREF_REG.test(url)) {
            CUtils.throwFatalError(`Non-https url specified: ${url}`);
        }
    },

    waitMs: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

module.exports = CUtils;
