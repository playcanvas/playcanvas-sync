import { expect } from 'chai';
import PathUtils from '../../src/utils/path-utils.js';

describe('PathUtils', function () {

    describe('#arToSlashForwPath', function () {
        it('should join array with forward slashes', function () {
            expect(PathUtils.arToSlashForwPath(['a', 'b', 'c'])).to.equal('a/b/c');
        });

        it('should handle single element array', function () {
            expect(PathUtils.arToSlashForwPath(['file.js'])).to.equal('file.js');
        });

        it('should handle empty array', function () {
            expect(PathUtils.arToSlashForwPath([])).to.equal('');
        });
    });

    describe('#pathArToFullLocal', function () {
        it('should join root with path array', function () {
            const result = PathUtils.pathArToFullLocal('/root', ['a', 'b', 'file.js']);
            // Result depends on OS, but should contain all parts
            expect(result).to.include('root');
            expect(result).to.include('a');
            expect(result).to.include('b');
            expect(result).to.include('file.js');
        });

        it('should handle empty path array', function () {
            const result = PathUtils.pathArToFullLocal('/root', []);
            expect(result).to.include('root');
        });
    });

    describe('#splitOnSlashForw', function () {
        it('should split path on forward slashes', function () {
            expect(PathUtils.splitOnSlashForw('a/b/c')).to.deep.equal(['a', 'b', 'c']);
        });

        it('should handle single segment', function () {
            expect(PathUtils.splitOnSlashForw('file.js')).to.deep.equal(['file.js']);
        });

        it('should handle empty string', function () {
            expect(PathUtils.splitOnSlashForw('')).to.deep.equal(['']);
        });
    });

    describe('#rmFirstSlash', function () {
        it('should remove leading forward slash', function () {
            expect(PathUtils.rmFirstSlash('/path/to/file')).to.equal('path/to/file');
        });

        it('should remove leading backslash', function () {
            expect(PathUtils.rmFirstSlash('\\path\\to\\file')).to.equal('path\\to\\file');
        });

        it('should not modify string without leading slash', function () {
            expect(PathUtils.rmFirstSlash('path/to/file')).to.equal('path/to/file');
        });

        it('should handle empty string', function () {
            expect(PathUtils.rmFirstSlash('')).to.equal('');
        });
    });

    describe('#rmLastSlash', function () {
        it('should remove trailing forward slash', function () {
            expect(PathUtils.rmLastSlash('path/to/folder/')).to.equal('path/to/folder');
        });

        it('should remove trailing backslash', function () {
            expect(PathUtils.rmLastSlash('path\\to\\folder\\')).to.equal('path\\to\\folder');
        });

        it('should not modify string without trailing slash', function () {
            expect(PathUtils.rmLastSlash('path/to/folder')).to.equal('path/to/folder');
        });

        it('should handle empty string', function () {
            expect(PathUtils.rmLastSlash('')).to.equal('');
        });
    });

    describe('#remotePathToData', function () {
        it('should parse path into folders and remotePath', function () {
            const result = PathUtils.remotePathToData('/scripts/utils/helper.js');
            expect(result.remotePath).to.equal('scripts/utils/helper.js');
            expect(result.folders).to.deep.equal(['scripts', 'scripts/utils']);
        });

        it('should handle path without leading slash', function () {
            const result = PathUtils.remotePathToData('scripts/helper.js');
            expect(result.remotePath).to.equal('scripts/helper.js');
            expect(result.folders).to.deep.equal(['scripts']);
        });

        it('should handle file in root folder', function () {
            const result = PathUtils.remotePathToData('/file.js');
            expect(result.remotePath).to.equal('file.js');
            expect(result.folders).to.deep.equal([]);
        });
    });

    describe('#partsToFolderRemotePaths', function () {
        it('should generate cumulative folder paths', function () {
            const result = PathUtils.partsToFolderRemotePaths(['a', 'b', 'c']);
            expect(result).to.deep.equal(['a', 'a/b', 'a/b/c']);
        });

        it('should handle single part', function () {
            const result = PathUtils.partsToFolderRemotePaths(['scripts']);
            expect(result).to.deep.equal(['scripts']);
        });

        it('should handle empty array', function () {
            const result = PathUtils.partsToFolderRemotePaths([]);
            expect(result).to.deep.equal([]);
        });
    });

    describe('#allFilePaths', function () {
        it('should collect all path parts from files', function () {
            const files = [
                { remotePath: 'a/b/file1.js' },
                { remotePath: 'a/c/file2.js' }
            ];
            const result = PathUtils.allFilePaths(files);
            expect(result).to.have.property('');
            expect(result).to.have.property('a');
            expect(result).to.have.property('a/b');
            expect(result).to.have.property('a/c');
        });

        it('should handle empty files array', function () {
            const result = PathUtils.allFilePaths([]);
            expect(result).to.deep.equal({});
        });
    });

    describe('#addPathParts', function () {
        it('should add all path parts to destination object', function () {
            const dst = {};
            PathUtils.addPathParts('a/b/c/file.js', dst);
            expect(dst).to.have.property('');
            expect(dst).to.have.property('a');
            expect(dst).to.have.property('a/b');
            expect(dst).to.have.property('a/b/c');
        });

        it('should handle file in root', function () {
            const dst = {};
            PathUtils.addPathParts('file.js', dst);
            expect(dst).to.have.property('');
        });
    });

    describe('#remoteDirFromParam', function () {
        it('should extract directory from path', function () {
            expect(PathUtils.remoteDirFromParam('scripts/utils/file.js')).to.equal('scripts/utils');
        });

        it('should return empty string for file in root', function () {
            expect(PathUtils.remoteDirFromParam('file.js')).to.equal('');
        });

        it('should handle single directory', function () {
            expect(PathUtils.remoteDirFromParam('scripts/file.js')).to.equal('scripts');
        });
    });

    describe('#rmEmptyFolders', function () {
        it('should remove folders that have no files', function () {
            const data = {
                folders: [
                    { remotePath: 'scripts' },
                    { remotePath: 'scripts/utils' },
                    { remotePath: 'empty' }
                ],
                files: [
                    { remotePath: 'scripts/utils/file.js' }
                ]
            };
            PathUtils.rmEmptyFolders(data);
            // Only folders that are in the path of existing files should remain
            expect(data.folders).to.have.lengthOf(2);
            expect(data.folders.map(f => f.remotePath)).to.include('scripts');
            expect(data.folders.map(f => f.remotePath)).to.include('scripts/utils');
        });
    });

});
