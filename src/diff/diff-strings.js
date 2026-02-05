import DiffChunks from './diff-chunks.js';
import DiffUtils from './diff-utils.js';
import ReportChunk from './report-chunk.js';

class DiffStrings {
    constructor(s1, s2) {
        this.s1 = s1;

        this.s2 = s2;
    }

    run() {
        this.setDiffs();

        this.formatDiffs();

        this.report();
    }

    setDiffs() {
        this.diffs = DiffUtils.computeDiffs(this.s1, this.s2);
    }

    formatDiffs() {
        this.lineObjs = DiffUtils.diffsToLineObjs(this.diffs);

        DiffUtils.addLineNums(this.lineObjs);

        this.chunks = new DiffChunks(this.lineObjs).run();
    }

    report() {
        console.log('--- remote');
        console.log('+++ local');

        this.chunks.forEach(h => new ReportChunk(h).run());
    }
}

export default DiffStrings;
