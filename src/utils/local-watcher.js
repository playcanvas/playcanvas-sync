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

        removed.sort(function (a, b) { // children before parents
            return b.length - a.length;
        });

        for (const s of removed) {
            await this.triggerEvent('ACTION_DELETED', this.origPathToData[s]);
        }
    }

    async visitFile(h) {
        await this.visItem(h);

        const data = this.origPathToData[h.fullPath];

        return data ? await this.handleKnownFile(h, data) : await this.handleCreatedFile(h);
    }

    async visitDir(h) {
        await this.visItem(h);

        if (!this.origPathToData[h.fullPath]) {
            await this.triggerEvent('ACTION_CREATED', h);
        }

        return true;
    }

    async handleKnownFile(h, data) {
    // NOTE: if the hash is not defined, then define it for the next iterations
        if (!data.hash) {
            h.hash = await CUtils.fileToMd5Hash(h.fullPath);

            return;
        }

    // NOTE: recalculate hash only if the modification time is changed.
        if (h.modTime !== data.modTime) {
            h.hash = await CUtils.fileToMd5Hash(h.fullPath);

            if (h.hash !== data.hash) {
                return this.triggerEvent('ACTION_MODIFIED', h);
            }
        } else {
            h.hash = data.hash;
        }
    }

    async handleCreatedFile(h) {
        h.hash = await CUtils.fileToMd5Hash(h.fullPath);

        return this.triggerEvent('ACTION_CREATED', h);
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
