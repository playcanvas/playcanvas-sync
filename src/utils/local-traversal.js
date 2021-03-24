const fs = require('fs').promises;
const PathUtils = require('./path-utils');

class LocalTraversal {
  constructor(rootDir, handler) {
    this.rootDir = rootDir;

    this.handler = handler;
  }

  async run() {
    await this.handleDir('', [], this.rootDir);

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
    pathAr = pathAr.concat([name]);

    const fullPath = PathUtils.pathArToFullLocal(this.rootDir, pathAr);

    const stat = await fs.stat(fullPath);

    const mtime = stat.mtime.getTime();

    if (stat.isFile()) {
      await this.handler.visitFile(name, pathAr, fullPath, mtime);

    } else if (stat.isDirectory()) {
      await this.handleDir(name, pathAr, fullPath);
    }
  }

  async handleDir(name, pathAr, fullPath) {
    const needRecur = await this.handler.previsitDir(name, pathAr, fullPath);

    if (needRecur) {
      await this.recursiveCall(pathAr);
    }

    await this.handler.postvisitDir(fullPath);
  }
}

module.exports = LocalTraversal;
