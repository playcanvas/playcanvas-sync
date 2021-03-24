const PathUtils = require('./path-utils');
const CUtils = require('./common-utils');
const TypeUtils = require('./type-utils');

class LocalContents {
  constructor(conf) {
    this.conf = conf;

    this.result = {
      files: [],
      folders: []
    };
  }

  prepRes() {
    if (!CUtils.isOperationType('overwrite_local')) {
      PathUtils.rmEmptyFolders(this.result);
    }

    return this.result;
  }

  visitFile(name, pathAr, fullPath, mtime) {
    const remotePath = PathUtils.arToSlashForwPath(pathAr);

    if (!TypeUtils.isBadFile(name, remotePath, this.conf)) {
      this.addToRes('files', pathAr, fullPath, mtime);
    }
  }

  previsitDir(name, pathAr, fullPath) {
    if (!pathAr.length) {
      return true;

    } else if (CUtils.isBadDir(fullPath, this.conf)) {
      return false;

    } else {
      this.addToRes('folders', pathAr, fullPath, null);

      return true;
    }
  }

  postvisitDir() {
    // nothing
  }

  addToRes(field, pathAr, fullPath, mtime) {
    const h = {
      remotePath: PathUtils.arToSlashForwPath(pathAr),
      fullPath: fullPath,
      modTime: mtime
    };

    this.result[field].push(h);
  }
}

module.exports = LocalContents;
