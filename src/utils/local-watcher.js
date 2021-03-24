const PathUtils = require('./path-utils');
const CUtils = require('./common-utils');
const TypeUtils = require('./type-utils');

class LocalWatcher {
  constructor(conf, orig, callback) {
    this.conf = conf;

    this.orig = orig;

    this.callback = callback;

    this.dirToFiles = {};

    this.init();
  }

  prepRes() {
    // nothing
  }

  visitFile(name, pathAr, fullPath, mtime) {

  }

  previsitDir(name, pathAr, fullPath) {

  }

  postvisitDir(fullPath) {

  }

}

module.exports = LocalWatcher;
