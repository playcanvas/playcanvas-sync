const fs = require('fs').promises;
const path = require('path');

class LocalTraversal {
  constructor(rootDir, handler) {
    this.rootDir = rootDir;

    this.handler = handler;
  }

  async run() {
    await this.recursiveCall([]);

    return this.handler.prepRes();
  }

  async recursiveCall(pathAr) {
    const items = await this.listItems(pathAr);

    for (const s of items) {
      await this.handleItem(s, pathAr);
    }
  }

  listItems(pathAr) {
    const fullPath = this.makeFullPath(pathAr);

    return fs.readdir(fullPath);
  }

  makeFullPath(pathAr) {
    const a = [ this.rootDir ].concat(pathAr);

    return path.join.apply(null, a);
  }

  async handleItem(name, pathAr) {
    pathAr = pathAr.concat([name]);

    const fullPath = this.makeFullPath(pathAr);

    const stat = await fs.stat(fullPath);

    const mtime = stat.mtime.getTime();

    if (stat.isFile()) {
      await this.handler.visitFile(name, pathAr, fullPath, mtime);

    } else if (stat.isDirectory()) {
      await this.handleDir(name, pathAr, fullPath, mtime);
    }
  }

  async handleDir(name, pathAr, fullPath, mtime) {
    const needRecur = await this.handler.visitDir(name, pathAr, fullPath, mtime);

    if (needRecur) {
      return this.recursiveCall(pathAr);
    }
  }
}

module.exports = LocalTraversal;
