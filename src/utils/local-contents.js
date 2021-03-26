const PathUtils = require('./path-utils');
const CUtils = require('./common-utils');
const TypeUtils = require('./type-utils');

class LocalContents {
  constructor(conf, keepEmptyFolders) {
    this.conf = conf;

    this.keepEmptyFolders = keepEmptyFolders;

    this.result = {
      files: [],
      folders: [],
      locPathToData: {}
    };
  }

  onTravEnd() {
    if (!this.keepEmptyFolders) {
      PathUtils.rmEmptyFolders(this.result);
    }

    return this.result;
  }

  visitFile(h) {
    if (!TypeUtils.isBadFile(h.itemName, h.remotePath, this.conf)) {
      this.addToRes('files', h);
    }
  }

  visitDir(h) {
    if (CUtils.isBadDir(h.remotePath, this.conf)) {
      return false;

    } else {
      this.addToRes('folders', h);

      return true;
    }
  }

  addToRes(field, h) {
    this.result[field].push(h);

    this.result.locPathToData[h.fullPath] = h;
  }
}

module.exports = LocalContents;
