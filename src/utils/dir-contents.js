const fs = require('fs');
const path = require('path');
const PathUtils = require('./path-utils');
const CUtils = require('./common-utils');
const TypeUtils = require('./type-utils');

class DirContents {
  constructor(conf) {
    this.conf = conf;

    this.result = {
      files: [],
      folders: []
    };
  }

  run() {
    this.recursiveCall([]);

    if (global.OPERATION_TYPE !== 'overwrite_local') {
      PathUtils.rmEmptyFolders(this.result);
    }

    return this.result;
  }

  recursiveCall(pathAr) {
    const items = this.listItems(pathAr);

    items.forEach(s => this.handleItem(s, pathAr));
  }

  listItems(pathAr) {
    const fullPath = this.makeFullPath(pathAr);

    return fs.readdirSync(fullPath);
  }

  makeFullPath(pathAr) {
    const a = [ this.conf.PLAYCANVAS_TARGET_DIR ].concat(pathAr);

    return path.join.apply(null, a);
  }

  handleItem(name, pathAr) {
    const a = pathAr.concat([name]);

    const remotePath = PathUtils.arToSlashForwPath(a);

    const fullPath = this.makeFullPath(a);

    const stat = fs.statSync(fullPath);

    if (this.isGoodFile(stat, name, remotePath)) {
      this.addToRes(a, fullPath, 'files');

    } else if (this.isGoodDir(stat, fullPath)) {
      this.addToRes(a, fullPath, 'folders');

      this.recursiveCall(a);
    }
  }

  isGoodFile(stat, name, remotePath) {
    return stat.isFile() && !TypeUtils.isBadFile(name, remotePath, this.conf);
  }

  isGoodDir(stat, fullPath) {
    return stat.isDirectory() && !CUtils.isBadDir(fullPath, this.conf);
  }

  addToRes(pathAr, fullPath, field) {
    const h = {
      remotePath: PathUtils.arToSlashForwPath(pathAr),
      fullPath: fullPath
    };

    this.result[field].push(h);
  }
}

module.exports = DirContents;
