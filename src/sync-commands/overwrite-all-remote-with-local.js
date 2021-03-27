const ActionCreated = require('../watch-actions/action-created');
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

    if (!this.doneAnyting) {
      console.log('Nothing done');
    }
  }

  async init() {
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

    this.actionEnd('Created', h);
  }

  async updateItem(h) {
    await WatchUtils.actionModified(h, this.conf);

    this.actionEnd('Updated', h);
  }

  actionEnd(action, h) {
    this.doneAnyting = true;

    console.log(`${action} ${h.remotePath}`);
  }
}

module.exports = OverwriteAllRemoteWithLocal;
