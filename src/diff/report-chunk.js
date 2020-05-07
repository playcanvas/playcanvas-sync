const DiffUtils = require('./diff-utils');

class ReportChunk {
  constructor(chunk) {
    this.chunk = chunk;
  }

  run() {
    this.reportHeader();

    this.chunk.forEach(DiffUtils.reportLine)
  }

  reportHeader() {
    const h1 = DiffUtils.getHeaderData(this.chunk, 'file_1_only');

    const h2 = DiffUtils.getHeaderData(this.chunk, 'file_2_only');

    const s = `@@ -${this.headerPart(h1)} +${this.headerPart(h2)} +@@`;

    console.log(s);
  }

  headerPart(h) {
    return `${h.start},${h.len}`;
  }
}

module.exports = ReportChunk;
