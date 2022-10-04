const PathUtils = require('./path-utils');
const CUtils = require('./common-utils');
const TypeUtils = require('./type-utils');

class LocalContents {
    constructor(conf) {
        this.conf = conf;

        this.result = {
            files: [],
            folders: [],
            locPathToData: {}
        };
    }

    onTravEnd() {
        PathUtils.rmEmptyFolders(this.result);

        return this.result;
    }

    visitFile(h) {
        if (!TypeUtils.isBadFile(h.itemName, h.remotePath, this.conf)) {
            this.addToRes('files', h);
        }
    }

    visitDir(h) {
        if (CUtils.isBadDir(h.remotePath, this.conf)) {
            return false;

        }
        this.addToRes('folders', h);

        return true;

    }

    addToRes(field, h) {
        this.result[field].push(h);

        this.result.locPathToData[h.fullPath] = h;
    }
}

module.exports = LocalContents;
