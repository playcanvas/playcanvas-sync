const fs = require('fs').promises;
const PathUtils = require('./path-utils');

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
    const fullPath = PathUtils.pathArToFullLocal(this.rootDir, pathAr);

    const items = await fs.readdir(fullPath);

    for (const s of items) {
      await this.handleItem(s, pathAr);
    }
  }

  async handleItem(name, pathAr) {
    const h = await PathUtils.makeLocItemData(name, pathAr, this.rootDir);

    if (h.isLocFile) {
      await this.handler.visitFile(h);

    } else if (h.isLocDir) {
      await this.handleDir(h);
    }
  }

  async handleDir(h) {
    const needRecur = await this.handler.visitDir(h);

    if (needRecur) {
      await this.recursiveCall(h.locPathAr);
    }
  }
}

module.exports = LocalTraversal;
