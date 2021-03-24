const path = require('path');
const fs = require('fs').promises;

const PathUtils = {
  // no leading slash
  arToSlashForwPath: function(a) {
    return a.join('/');
  },

  pathArToFullLocal: function (r, pathAr) {
    const a = [ r ].concat(pathAr);

    return path.join.apply(null, a);
  },

  fullPathToLocalFile: function (part1, part2) {
    p = path.join(part1, part2);

    return path.normalize(p);
  },

  splitOnSlashForw: function(s) {
    return s.split('/');
  },

  rmFirstSlash: function (s) {
    return s.replace(/^[\\/]/, '');
  },

  fullLocalToRemotePath: function (p, targetDir) {
    p = path.relative(targetDir, p);

    return PathUtils.replaceBackSlash(p);
  },

  relativeLocalToRemotePath: function(p) {
    p = PathUtils.rmFirstSlash(p);

    return PathUtils.replaceBackSlash(p);
  },

  replaceBackSlash: function (s) {
    return s.replace(/\\/g, '/');
  },

  arePathsEqual: function (s1, s2) {
    s1 = path.normalize(s1);

    s2 = path.normalize(s2);

    return s1 === s2;
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

  eventToFullPath: function (e) {
    return path.join(e.directory, e.file);
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

    const stat = await fs.stat(fullPath);

    return {
      itemName: name,
      pathArray: pathAr,
      parentFull: PathUtils.pathArToFullLocal(rootDir, parentAr),
      parentRemote: PathUtils.arToSlashForwPath(parentAr),
      remotePath: PathUtils.arToSlashForwPath(pathAr),
      fullPath: fullPath,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      modTime: stat.mtime.getTime()
    }
  }
};

module.exports = PathUtils;
