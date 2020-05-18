const path = require('path');
const fs = require('fs');
const CUtils = require('../utils/common-utils');

class ActionCreated {
  constructor(event, conf) {
    this.event = event;

    this.conf = conf;
  }

  async run() {
    this.init();

    const response = await this.createRemote();

    const asset = JSON.parse(response);

    this.conf.store.handleAddedAsset(asset);

    return asset.id;
  }

  init() {
    this.fullPath = path.join(this.event.directory, this.event.file);

    const fullParent = path.dirname(this.fullPath);

    this.parentId = CUtils.getAssetId(fullParent, this.conf);

    this.assetName = path.basename(this.fullPath);
  }

  createRemote() {
    const stat = fs.statSync(this.fullPath);

    if (stat.isFile()) {
      return this.createFile();

    } else if (stat.isDirectory()) {
      return this.createDirectory();
    }
  }

  createFile() {
    const h = { preload: 'true' };

    return this.callApi(h, this.fullPath);
  }

  createDirectory() {
    const h = { type: 'folder' };

    return this.callApi(h, null);
  }

  callApi(opts, srcPath) {
    const h = {
      name: this.assetName,
      projectId: this.conf.PLAYCANVAS_PROJECT_ID,
      branchId: this.conf.PLAYCANVAS_BRANCH_ID
    };

    Object.assign(h, opts);

    CUtils.addKeyVal(h, 'parent', this.parentId);

    if (srcPath) {
      h.file = fs.createReadStream(srcPath);
    }

    return this.conf.client.postForm('/assets', h);
  }
}

module.exports = ActionCreated;
