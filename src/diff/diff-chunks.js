const DiffUtils = require('./diff-utils.js');

const numContextLines = 3;

class DiffChunks {
    constructor(lineObjs) {
        this.lineObjs = lineObjs;

        this.startInds = [];
    }

    run() {
        this.setStartInds();

        this.setEndInds();

        return this.startInds.map(this.makeChunk, this);
    }

    setStartInds() {
        let state = 'out';

        this.lineObjs.forEach((h, ind) => {
            if (h.type === 'both_files') {
                if (state === 'in') {
                    state = 'out';
                }
            } else {
                if (state === 'out') {
                    state = 'in';
                    this.startInds.push(ind);
                    this.markUsed(h);
                }
            }
        });
    }

    setEndInds() {
        this.endInds = this.startInds.map(i => DiffUtils.getChunkEnd(this.lineObjs, i));
    }

    makeChunk(startInd, i) {
        const endInd = this.endInds[i];

        const fromInd = DiffUtils.getContextLines(this.lineObjs, startInd, numContextLines, true);

        const toInd = DiffUtils.getContextLines(this.lineObjs, endInd, numContextLines, false);

        this.markUsed(this.lineObjs[fromInd]);

        this.markUsed(this.lineObjs[toInd]);

        return this.lineObjs.slice(fromInd, toInd + 1);
    }

    markUsed(h) {
        h.lineUsed = true;
    }
}

module.exports = DiffChunks;
