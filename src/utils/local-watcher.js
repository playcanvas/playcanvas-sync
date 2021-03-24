const CUtils = require('./common-utils');

class LocalWatcher {
  constructor(conf, origPathToData, callback) {
    this.conf = conf;

    this.origPathToData = origPathToData;

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

  visitFile(h) {
    this.addToCur(h);

    const data = this.origPathToData[h.fullPath];

    return data ? this.handleKnownFile(h, data) : this.triggerEvent('ACTION_CREATED', h);
  }

  async visitDir(h) {
    this.addToCur(h);

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

  addToCur(h) {
    this.curPathToData[h.fullPath] = h;
  }

  triggerEvent(action, h) {
    const event = {
      action: action,
      file: h.itemName
    };

    Object.assign(event, h);

    return this.callback(event, this.conf);
  }
}

module.exports = LocalWatcher;
