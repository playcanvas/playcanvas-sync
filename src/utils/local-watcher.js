class LocalWatcher {
  constructor(origPathToData, callback) {
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
      await this.handleRemoved(this.origPathToData[s]);
    }
  }

  visitFile(h) {
    this.addToCur(h);

    const data = this.origPathToData[h.fullPath];

    return data ? this.handleKnownFile(h, data) : this.handleNew(h);
  }

  async visitDir(h) {
    this.addToCur(h);

    if (!this.origPathToData[h.fullPath]) {
      await this.handleNew(h)
    }

    return true;
  }

  handleKnownFile(h, data) {
    if (h.modTime !== data.modTime) {
      return this.handleModified(h);
    }
  }

  addToCur(h) {
    this.curPathToData[h.fullPath] = h;
  }
}

module.exports = LocalWatcher;
