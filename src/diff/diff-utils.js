import diff_match_patch from './diff_match_patch_uncompressed.cjs';
import CUtils from '../utils/common-utils.js';

const diffValToType = {
    '-1': 'file_1_only',
    '1': 'file_2_only',
    '0': 'both_files'
};

const diffTypeToSign = {
    file_1_only: '-',
    file_2_only: '+',
    both_files: ' '
};

const diffTypeToNumField = {
    file_1_only: 'num_in_1',
    file_2_only: 'num_in_2'
};

const DiffUtils = {
    diffsToLineObjs: function (diffs) {
        const res = [];

        diffs.forEach(DiffUtils.addDiffType);

        diffs.forEach(h => DiffUtils.handleLines(h, res));

        return res;
    },

    addDiffType: function (h) {
        h.type = diffValToType[h[0]];
    },

    handleLines: function (h, res) {
        const a = DiffUtils.diffToLineStrs(h[1]);

        const lineObjs = a.map(s => DiffUtils.makeLineObj(s, h.type));

        CUtils.pushArToAr(res, lineObjs);
    },

    diffToLineStrs: function (s) {
        const a = s.split(/\r?\n/); // windows

        return DiffUtils.rmLastIfEmpty(a);
    },

    rmLastIfEmpty: function (a) {
        const lastInd = a.length - 1;

        return a[lastInd] ?
            a : a.slice(0, lastInd);
    },

    makeLineObj: function (s, type) {
        return {
            text: s,
            type: type
        };
    },

    reportLine: function (h) {
        const sign = diffTypeToSign[h.type];

        const s = sign + h.text;

        console.log(s);
    },

    // https://github.com/google/diff-match-patch/wiki/Line-or-Word-Diffs
    computeDiffs: function (s1, s2) {
        const dmp = new diff_match_patch();

        const a = dmp.diff_linesToChars_(s1, s2);

        const lineText1 = a.chars1;

        const lineText2 = a.chars2;

        const lineArray = a.lineArray;

        const diffs = dmp.diff_main(lineText1, lineText2, false);

        dmp.diff_charsToLines_(diffs, lineArray);

        return diffs;
    },

    addLineNums: function (a) {
        let count1 = 0;
        let count2 = 0;

        a.forEach((h) => {
            if (h.type === 'both_files') {
                count1++;
                count2++;
                h.num_in_1 = count1;
                h.num_in_2 = count2;

            } else if (h.type === 'file_1_only') {
                count1++;
                h.num_in_1 = count1;

            } else if (h.type === 'file_2_only') {
                count2++;
                h.num_in_2 = count2;
            }
        });
    },

    getChunkEnd: function (a, ind) {
        while (ind < a.length) {
            if (a[ind].type === 'both_files') {
                return ind - 1;
            }

            ind++;
        }

        return ind - 1;
    },

    getContextLines: function (a, ind, n, isBefore) {
        while (ind > 0 && ind < a.length - 1) {
            if (a[ind].type === 'both_files') {
                n--;

                if (!n || a[ind].lineUsed) {
                    return ind;
                }
            }

            ind += isBefore ? -1 : 1;
        }

        return ind;
    },

    getHeaderData: function (chunk, type) {
        const firstLine = DiffUtils.limitForFile(chunk, type);

        if (!firstLine) {
            return { start: 0, len: 0 };
        }

        const lastLine = DiffUtils.limitForFile(chunk.slice().reverse(), type);

        const nField = diffTypeToNumField[type];

        return {
            start: firstLine[nField],
            len: lastLine[nField] - firstLine[nField] + 1
        };
    },

    limitForFile: function (a, type) {
        return a.find(h => h.type === type || h.type === 'both_files');
    }
};

export default DiffUtils;
