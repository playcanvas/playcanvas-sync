const path = require('path');
const fs = require('fs').promises;

const PathUtils = {
    normTargPath: function (s) {
        s = s.replace(/[\\/]$/, '');

        return path.normalize(s);
    },

    // no leading slash
    arToSlashForwPath: function(a) {
        return a.join('/');
    },

    pathArToFullLocal: function (r, pathAr) {
        const a = [ r ].concat(pathAr);

        return path.join.apply(null, a);
    },

    splitOnSlashForw: function(s) {
        return s.split('/');
    },

    rmFirstSlash: function (s) {
        return s.replace(/^[\\/]/, '');
    },

    replaceBackSlash: function (s) {
        return s.replace(/\\/g, '/');
    },

    remotePathToData: function(s) {
        s = PathUtils.rmFirstSlash(s);

        const a = PathUtils.splitOnSlashForw(s);

        const folderParts = a.slice(0, a.length - 1);

        return {
            folders: PathUtils.partsToFolderRemotePaths(folderParts),
            remotePath: s
        }
    },

    partsToFolderRemotePaths: function (parts) {
        const res = [];

        parts.forEach((s, ind) => {
            const a = parts.slice(0, ind + 1);

            const p = PathUtils.arToSlashForwPath(a);

            res.push(p);
        });

        return res;
    },

    rmEmptyFolders: function (data) {
        const paths = PathUtils.allFilePaths(data.files);

        data.folders = data.folders.filter(h => paths[h.remotePath]);
    },

    allFilePaths: function (files) {
        const res = {};

        files.forEach(h => PathUtils.addPathParts(h.remotePath, res));

        return res;
    },

    addPathParts: function (remotePath, dst) {
        const parts = PathUtils.splitOnSlashForw(remotePath);

        for (let i = 0; i < parts.length; i++) {
            const a = parts.slice(0, i);

            const s = PathUtils.arToSlashForwPath(a);

            dst[s] = 1;
        }
    },

    makeLocItemData: async function (name, parentAr, rootDir) {
        const pathAr = parentAr.concat([name]);

        const fullPath = PathUtils.pathArToFullLocal(rootDir, pathAr);

        const stat = await PathUtils.fsWrap('stat', fullPath);

        return stat ? {
            itemName: name,
            fullPath: fullPath,
            remotePath: PathUtils.arToSlashForwPath(pathAr),
            isFile: stat.isFile(),
            isDirectory: stat.isDirectory(),
            modTime: stat.mtime.getTime(),
            pathArray: pathAr,
            parentFull: PathUtils.pathArToFullLocal(rootDir, parentAr),
            parentRemote: PathUtils.arToSlashForwPath(parentAr)
        } : {};
    },

    fsWrap: async function (method, fullPath) {
        try {
            const res = await fs[method](fullPath);

            return res;

        } catch (e) {
            return null;
        }
    }
};

module.exports = PathUtils;
