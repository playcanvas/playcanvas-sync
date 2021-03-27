const CUtils = require('./common-utils');

class LocalWatcher {
  constructor(conf, origPathToData, waitTime, callback) {
    this.conf = conf;

    this.origPathToData = origPathToData;

    this.waitTime = waitTime;

    this.callback = callback;

    this.curPathToData = {};
  }

  async onTravEnd() {
    await this.handleAllRemoved();

    return this.curPathToData;
  }

  async handleAllRemoved() {
    const a = Object.keys(this.origPathToData);

    const removed = a.filter(s => !this.curPathToData[s]);

    removed.sort( function(a, b) { // children before parents
      return b.length - a.length;
    });

    for (const s of removed) {
      await this.triggerEvent('ACTION_DELETED', this.origPathToData[s]);
    }
  }

  async visitFile(h) {
    await this.visItem(h);

    const data = this.origPathToData[h.fullPath];

    return data ? this.handleKnownFile(h, data) : this.triggerEvent('ACTION_CREATED', h);
  }

  async visitDir(h) {
    await this.visItem(h);

    if (!this.origPathToData[h.fullPath]) {
      await this.triggerEvent('ACTION_CREATED', h)
    }

    return true;
  }

  handleKnownFile(h, data) {
    if (h.modTime !== data.modTime) {
      return this.triggerEvent('ACTION_MODIFIED', h);
    }
  }

  async visItem(h) {
    this.curPathToData[h.fullPath] = h;

    await CUtils.waitMs(this.waitTime);
  }

  triggerEvent(action, h) {
    const event = { action: action };

    Object.assign(event, h);

    return this.callback(event, this.conf);
  }
}

module.exports = LocalWatcher;
