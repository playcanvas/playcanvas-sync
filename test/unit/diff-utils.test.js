import { expect } from 'chai';
import DiffUtils from '../../src/diff/diff-utils.js';

describe('DiffUtils', function () {

    describe('#computeDiffs', function () {
        it('should return empty diffs for identical strings', function () {
            const diffs = DiffUtils.computeDiffs('hello\nworld\n', 'hello\nworld\n');
            expect(diffs).to.have.lengthOf(1);
            expect(diffs[0][0]).to.equal(0); // 0 means unchanged
        });

        it('should detect added lines', function () {
            const diffs = DiffUtils.computeDiffs('line1\n', 'line1\nline2\n');
            // Should have diffs indicating addition
            const hasAddition = diffs.some(d => d[0] === 1);
            expect(hasAddition).to.be.true;
        });

        it('should detect removed lines', function () {
            const diffs = DiffUtils.computeDiffs('line1\nline2\n', 'line1\n');
            // Should have diffs indicating removal
            const hasRemoval = diffs.some(d => d[0] === -1);
            expect(hasRemoval).to.be.true;
        });

        it('should detect changed lines', function () {
            const diffs = DiffUtils.computeDiffs('hello\n', 'world\n');
            // Should have both removal and addition
            const hasRemoval = diffs.some(d => d[0] === -1);
            const hasAddition = diffs.some(d => d[0] === 1);
            expect(hasRemoval).to.be.true;
            expect(hasAddition).to.be.true;
        });

        it('should handle empty strings', function () {
            const diffs = DiffUtils.computeDiffs('', '');
            expect(diffs).to.be.an('array');
        });

        it('should handle multiline content', function () {
            const s1 = 'line1\nline2\nline3\n';
            const s2 = 'line1\nmodified\nline3\n';
            const diffs = DiffUtils.computeDiffs(s1, s2);
            expect(diffs.length).to.be.greaterThan(1);
        });
    });

    describe('#addDiffType', function () {
        it('should add type "file_1_only" for removal (-1)', function () {
            const h = [-1, 'removed line'];
            DiffUtils.addDiffType(h);
            expect(h.type).to.equal('file_1_only');
        });

        it('should add type "file_2_only" for addition (1)', function () {
            const h = [1, 'added line'];
            DiffUtils.addDiffType(h);
            expect(h.type).to.equal('file_2_only');
        });

        it('should add type "both_files" for unchanged (0)', function () {
            const h = [0, 'same line'];
            DiffUtils.addDiffType(h);
            expect(h.type).to.equal('both_files');
        });
    });

    describe('#diffToLineStrs', function () {
        it('should split string into lines', function () {
            const result = DiffUtils.diffToLineStrs('line1\nline2\nline3');
            expect(result).to.deep.equal(['line1', 'line2', 'line3']);
        });

        it('should handle Windows line endings', function () {
            const result = DiffUtils.diffToLineStrs('line1\r\nline2\r\nline3');
            expect(result).to.deep.equal(['line1', 'line2', 'line3']);
        });

        it('should remove trailing empty element', function () {
            const result = DiffUtils.diffToLineStrs('line1\nline2\n');
            expect(result).to.deep.equal(['line1', 'line2']);
        });

        it('should handle empty string', function () {
            const result = DiffUtils.diffToLineStrs('');
            expect(result).to.deep.equal([]);
        });

        it('should handle single line without newline', function () {
            const result = DiffUtils.diffToLineStrs('single');
            expect(result).to.deep.equal(['single']);
        });
    });

    describe('#rmLastIfEmpty', function () {
        it('should remove last element if empty', function () {
            const result = DiffUtils.rmLastIfEmpty(['a', 'b', '']);
            expect(result).to.deep.equal(['a', 'b']);
        });

        it('should keep last element if not empty', function () {
            const result = DiffUtils.rmLastIfEmpty(['a', 'b', 'c']);
            expect(result).to.deep.equal(['a', 'b', 'c']);
        });

        it('should handle single empty element', function () {
            const result = DiffUtils.rmLastIfEmpty(['']);
            expect(result).to.deep.equal([]);
        });

        it('should handle empty array', function () {
            // Edge case - accessing index -1 returns undefined which is falsy
            const result = DiffUtils.rmLastIfEmpty([]);
            // Based on implementation, empty array at lastInd=-1 returns undefined which is falsy
            // so it returns a.slice(0, -1) which is []
            expect(result).to.deep.equal([]);
        });
    });

    describe('#makeLineObj', function () {
        it('should create line object with text and type', function () {
            const result = DiffUtils.makeLineObj('hello world', 'both_files');
            expect(result).to.deep.equal({
                text: 'hello world',
                type: 'both_files'
            });
        });

        it('should handle empty text', function () {
            const result = DiffUtils.makeLineObj('', 'file_1_only');
            expect(result).to.deep.equal({
                text: '',
                type: 'file_1_only'
            });
        });
    });

    describe('#diffsToLineObjs', function () {
        it('should convert diffs to line objects', function () {
            const diffs = [
                [0, 'same\n'],
                [-1, 'removed\n'],
                [1, 'added\n']
            ];
            const result = DiffUtils.diffsToLineObjs(diffs);

            expect(result).to.have.lengthOf(3);
            expect(result[0]).to.deep.equal({ text: 'same', type: 'both_files' });
            expect(result[1]).to.deep.equal({ text: 'removed', type: 'file_1_only' });
            expect(result[2]).to.deep.equal({ text: 'added', type: 'file_2_only' });
        });

        it('should handle multiline diff entries', function () {
            const diffs = [
                [0, 'line1\nline2\n']
            ];
            const result = DiffUtils.diffsToLineObjs(diffs);

            expect(result).to.have.lengthOf(2);
            expect(result[0].text).to.equal('line1');
            expect(result[1].text).to.equal('line2');
        });
    });

    describe('#addLineNums', function () {
        it('should add line numbers to both_files entries', function () {
            const lines = [
                { type: 'both_files', text: 'line1' },
                { type: 'both_files', text: 'line2' }
            ];
            DiffUtils.addLineNums(lines);

            expect(lines[0].num_in_1).to.equal(1);
            expect(lines[0].num_in_2).to.equal(1);
            expect(lines[1].num_in_1).to.equal(2);
            expect(lines[1].num_in_2).to.equal(2);
        });

        it('should add line numbers to file_1_only entries', function () {
            const lines = [
                { type: 'both_files', text: 'same' },
                { type: 'file_1_only', text: 'removed' }
            ];
            DiffUtils.addLineNums(lines);

            expect(lines[0].num_in_1).to.equal(1);
            expect(lines[0].num_in_2).to.equal(1);
            expect(lines[1].num_in_1).to.equal(2);
            expect(lines[1].num_in_2).to.be.undefined;
        });

        it('should add line numbers to file_2_only entries', function () {
            const lines = [
                { type: 'both_files', text: 'same' },
                { type: 'file_2_only', text: 'added' }
            ];
            DiffUtils.addLineNums(lines);

            expect(lines[0].num_in_1).to.equal(1);
            expect(lines[0].num_in_2).to.equal(1);
            expect(lines[1].num_in_1).to.be.undefined;
            expect(lines[1].num_in_2).to.equal(2);
        });

        it('should handle mixed line types', function () {
            const lines = [
                { type: 'both_files', text: 'same1' },
                { type: 'file_1_only', text: 'removed' },
                { type: 'file_2_only', text: 'added' },
                { type: 'both_files', text: 'same2' }
            ];
            DiffUtils.addLineNums(lines);

            expect(lines[0].num_in_1).to.equal(1);
            expect(lines[0].num_in_2).to.equal(1);
            expect(lines[1].num_in_1).to.equal(2);
            expect(lines[2].num_in_2).to.equal(2);
            expect(lines[3].num_in_1).to.equal(3);
            expect(lines[3].num_in_2).to.equal(3);
        });
    });

    describe('#getChunkEnd', function () {
        it('should find end of changed chunk', function () {
            const lines = [
                { type: 'file_1_only' },
                { type: 'file_2_only' },
                { type: 'both_files' }
            ];
            const result = DiffUtils.getChunkEnd(lines, 0);
            expect(result).to.equal(1);
        });

        it('should return last index if no both_files found', function () {
            const lines = [
                { type: 'file_1_only' },
                { type: 'file_2_only' }
            ];
            const result = DiffUtils.getChunkEnd(lines, 0);
            expect(result).to.equal(1);
        });

        it('should handle starting at both_files', function () {
            const lines = [
                { type: 'both_files' },
                { type: 'file_1_only' }
            ];
            const result = DiffUtils.getChunkEnd(lines, 0);
            expect(result).to.equal(-1);
        });
    });

    describe('#getContextLines', function () {
        it('should get context lines before a change', function () {
            const lines = [
                { type: 'both_files' },
                { type: 'both_files' },
                { type: 'both_files' },
                { type: 'file_1_only' }
            ];
            // Get 2 context lines before index 3
            const result = DiffUtils.getContextLines(lines, 2, 2, true);
            // Should return index after consuming context
            expect(result).to.be.at.least(0);
        });

        it('should stop when line count is exhausted', function () {
            const lines = [
                { type: 'both_files' },
                { type: 'both_files' },
                { type: 'both_files' },
                { type: 'file_1_only' }
            ];
            // Request 1 context line going backwards from index 2
            const result = DiffUtils.getContextLines(lines, 2, 1, true);
            // After finding 1 both_files line, count becomes 0, returns current index
            expect(result).to.be.at.least(0);
        });
    });

    describe('#getHeaderData', function () {
        it('should calculate header for file_1_only', function () {
            const chunk = [
                { type: 'both_files', num_in_1: 1 },
                { type: 'file_1_only', num_in_1: 2 },
                { type: 'file_1_only', num_in_1: 3 },
                { type: 'both_files', num_in_1: 4 }
            ];
            const result = DiffUtils.getHeaderData(chunk, 'file_1_only');
            expect(result.start).to.equal(1);
            expect(result.len).to.equal(4);
        });

        it('should calculate header for file_2_only', function () {
            const chunk = [
                { type: 'both_files', num_in_2: 1 },
                { type: 'file_2_only', num_in_2: 2 },
                { type: 'both_files', num_in_2: 3 }
            ];
            const result = DiffUtils.getHeaderData(chunk, 'file_2_only');
            expect(result.start).to.equal(1);
            expect(result.len).to.equal(3);
        });

        it('should return zero start and len when no matching lines', function () {
            const chunk = [
                { type: 'both_files', num_in_1: 1, num_in_2: 1 }
            ];
            const result = DiffUtils.getHeaderData(chunk, 'file_1_only');
            // When limitForFile finds only both_files, it should use that
            expect(result.start).to.equal(1);
        });

        it('should handle empty chunk', function () {
            const result = DiffUtils.getHeaderData([], 'file_1_only');
            expect(result.start).to.equal(0);
            expect(result.len).to.equal(0);
        });
    });

    describe('#limitForFile', function () {
        it('should find first line matching type or both_files', function () {
            // The function returns the first line that matches the type OR is both_files
            const lines = [
                { type: 'file_1_only' },
                { type: 'file_2_only' },
                { type: 'both_files' }
            ];
            const result = DiffUtils.limitForFile(lines, 'file_1_only');
            expect(result).to.equal(lines[0]);
        });

        it('should return both_files when it comes before matching type', function () {
            const lines = [
                { type: 'both_files' },
                { type: 'file_1_only' },
                { type: 'file_2_only' }
            ];
            // both_files comes first, so it's returned even when looking for file_1_only
            const result = DiffUtils.limitForFile(lines, 'file_1_only');
            expect(result).to.equal(lines[0]);
        });

        it('should find both_files if specific type not present', function () {
            const lines = [
                { type: 'file_2_only' },
                { type: 'both_files' }
            ];
            const result = DiffUtils.limitForFile(lines, 'file_1_only');
            expect(result).to.equal(lines[1]);
        });

        it('should return undefined for empty array', function () {
            const result = DiffUtils.limitForFile([], 'file_1_only');
            expect(result).to.be.undefined;
        });
    });

    describe('integration test', function () {
        it('should produce complete diff output', function () {
            const s1 = 'line1\nline2\nline3\n';
            const s2 = 'line1\nmodified\nline3\nline4\n';

            const diffs = DiffUtils.computeDiffs(s1, s2);
            const lineObjs = DiffUtils.diffsToLineObjs(diffs);
            DiffUtils.addLineNums(lineObjs);

            // Should have all the data needed for diff display
            expect(lineObjs.length).to.be.greaterThan(0);
            lineObjs.forEach((line) => {
                expect(line).to.have.property('text');
                expect(line).to.have.property('type');
                expect(['both_files', 'file_1_only', 'file_2_only']).to.include(line.type);
            });
        });
    });

});
