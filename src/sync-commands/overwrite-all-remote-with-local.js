const ActionCreated = require('../watch-actions/action-created');
const CUtils = require('../utils/common-utils');
const WatchUtils = require('../watch-actions/watch-utils');
const ComputeDiffAll = require('./compute-diff-all');
const GetConfig = require('../utils/get-config');

class OverwriteAllRemoteWithLocal {
  constructor(limitToItems) {
    this.limitToItems = limitToItems;
  }

  async run() {
    await this.init();

    await this.handleAllFolders();

    await this.handleAllFiles();
  }

  async init() {
    CUtils.setOperationType('overwrite_remote');

    this.conf = await new GetConfig().run();

    this.diff = await new ComputeDiffAll(this.limitToItems).run();
  }

  async handleAllFolders() {
    for (const h of this.diff.extraItems.local.folders) {
      await this.createItem(h); // parents before children
    }
  }

  handleAllFiles() {
    const promises1 = this.diff.filesThatDiffer.map(this.updateItem, this);

    const promises2 = this.diff.extraItems.local.files.map(this.createItem, this);

    return Promise.all(promises1.concat(promises2));
  }

  async createItem(h) {
    await new ActionCreated(h, this.conf).run();

    CUtils.syncMsg(`Created ${h.remotePath}`);
  }

  async updateItem(h) {
    await WatchUtils.actionModified(h, this.conf);

    CUtils.syncMsg(`Updated ${h.remotePath}`);
  }
}

module.exports = OverwriteAllRemoteWithLocal;
