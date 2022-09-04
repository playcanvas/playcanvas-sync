const PathUtils = require('./path-utils');
const CUtils = require('./common-utils');
const TypeUtils = require('./type-utils');

class LocalContents {
  constructor(conf) {
    this.conf = conf;

    this.result = {
      files: [],
      folders: [],
      locPathToData: {}
    };
  }

  onTravEnd() {
    PathUtils.rmEmptyFolders(this.result);

    return this.result;
  }

  async visitFile(h) {
    if (!TypeUtils.isBadFile(h.itemName, h.remotePath, this.conf)) {
      h.hash = await CUtils.fileToMd5Hash(h.fullPath);

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
