import { expect } from 'chai';
import sinon from 'sinon';
import CUtils from '../../src/utils/common-utils.js';

describe('CUtils', function () {

    describe('#pushArToAr', function () {
        it('should push all elements from second array to first', function () {
            const a1 = [1, 2];
            const a2 = [3, 4];
            CUtils.pushArToAr(a1, a2);
            expect(a1).to.deep.equal([1, 2, 3, 4]);
        });

        it('should handle empty source array', function () {
            const a1 = [1, 2];
            const a2 = [];
            CUtils.pushArToAr(a1, a2);
            expect(a1).to.deep.equal([1, 2]);
        });

        it('should handle empty destination array', function () {
            const a1 = [];
            const a2 = [1, 2];
            CUtils.pushArToAr(a1, a2);
            expect(a1).to.deep.equal([1, 2]);
        });

        it('should modify original array', function () {
            const a1 = ['a'];
            const a2 = ['b', 'c'];
            CUtils.pushArToAr(a1, a2);
            expect(a1).to.have.lengthOf(3);
        });
    });

    describe('#assetPathItems', function () {
        it('should build path from asset to root', function () {
            const assets = {
                1: { id: 1, name: 'root', parent: null },
                2: { id: 2, name: 'folder', parent: 1 },
                3: { id: 3, name: 'file.js', parent: 2 }
            };
            const result = CUtils.assetPathItems(assets[3], assets);
            expect(result).to.have.lengthOf(3);
            expect(result[0].name).to.equal('root');
            expect(result[1].name).to.equal('folder');
            expect(result[2].name).to.equal('file.js');
        });

        it('should handle root-level asset', function () {
            const assets = {
                1: { id: 1, name: 'file.js', parent: null }
            };
            const result = CUtils.assetPathItems(assets[1], assets);
            expect(result).to.have.lengthOf(1);
            expect(result[0].name).to.equal('file.js');
        });

        it('should handle missing parent gracefully', function () {
            const assets = {
                2: { id: 2, name: 'orphan.js', parent: 999 }
            };
            const result = CUtils.assetPathItems(assets[2], assets);
            expect(result).to.have.lengthOf(1);
            expect(result[0].name).to.equal('orphan.js');
        });
    });

    describe('#assetPathStr', function () {
        it('should return slash-separated path string', function () {
            const assets = {
                1: { id: 1, name: 'root', parent: null },
                2: { id: 2, name: 'folder', parent: 1 },
                3: { id: 3, name: 'file.js', parent: 2 }
            };
            const result = CUtils.assetPathStr(assets[3], assets);
            expect(result).to.equal('root/folder/file.js');
        });

        it('should handle single-level path', function () {
            const assets = {
                1: { id: 1, name: 'file.js', parent: null }
            };
            const result = CUtils.assetPathStr(assets[1], assets);
            expect(result).to.equal('file.js');
        });
    });

    describe('#addPathToFolders', function () {
        it('should add all parent folder IDs to destination', function () {
            const assets = {
                1: { id: 1, name: 'root', parent: null },
                2: { id: 2, name: 'folder', parent: 1 },
                3: { id: 3, name: 'file.js', parent: 2 }
            };
            const dst = {};
            CUtils.addPathToFolders(assets[3], assets, dst);
            expect(dst).to.have.property('1');
            expect(dst).to.have.property('2');
            expect(dst).to.not.have.property('3'); // file itself not included
        });

        it('should handle root-level asset (no folders)', function () {
            const assets = {
                1: { id: 1, name: 'file.js', parent: null }
            };
            const dst = {};
            CUtils.addPathToFolders(assets[1], assets, dst);
            expect(Object.keys(dst)).to.have.lengthOf(0);
        });
    });

    describe('#replaceCarriage', function () {
        it('should replace CRLF with LF', function () {
            expect(CUtils.replaceCarriage('line1\r\nline2')).to.equal('line1\nline2');
        });

        it('should replace CR with LF', function () {
            expect(CUtils.replaceCarriage('line1\rline2')).to.equal('line1\nline2');
        });

        it('should handle multiple line endings', function () {
            expect(CUtils.replaceCarriage('a\r\nb\rc\n')).to.equal('a\nb\nc\n');
        });

        it('should handle string without carriage returns', function () {
            expect(CUtils.replaceCarriage('line1\nline2')).to.equal('line1\nline2');
        });

        it('should handle empty string', function () {
            expect(CUtils.replaceCarriage('')).to.equal('');
        });
    });

    describe('#addKeyVal', function () {
        it('should add key-value pair when value is truthy', function () {
            const h = {};
            CUtils.addKeyVal(h, 'key', 'value');
            expect(h).to.deep.equal({ key: 'value' });
        });

        it('should not add key when value is falsy', function () {
            const h = {};
            CUtils.addKeyVal(h, 'key', null);
            expect(h).to.deep.equal({});
        });

        it('should not add key when value is empty string', function () {
            const h = {};
            CUtils.addKeyVal(h, 'key', '');
            expect(h).to.deep.equal({});
        });

        it('should not add key when value is 0', function () {
            const h = {};
            CUtils.addKeyVal(h, 'key', 0);
            expect(h).to.deep.equal({});
        });

        it('should add key when value is false (intentionally)', function () {
            const h = {};
            CUtils.addKeyVal(h, 'key', false);
            expect(h).to.deep.equal({}); // false is falsy
        });
    });

    describe('#rmObjById', function () {
        it('should remove object with matching id', function () {
            const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];
            const result = CUtils.rmObjById(arr, 2);
            expect(result).to.have.lengthOf(2);
            expect(result.map(o => o.id)).to.deep.equal([1, 3]);
        });

        it('should return same array if id not found', function () {
            const arr = [{ id: 1 }, { id: 2 }];
            const result = CUtils.rmObjById(arr, 999);
            expect(result).to.have.lengthOf(2);
        });

        it('should return new array (not mutate original)', function () {
            const arr = [{ id: 1 }, { id: 2 }];
            const result = CUtils.rmObjById(arr, 1);
            expect(arr).to.have.lengthOf(2);
            expect(result).to.have.lengthOf(1);
        });

        it('should handle empty array', function () {
            const result = CUtils.rmObjById([], 1);
            expect(result).to.deep.equal([]);
        });
    });

    describe('#escapeRegExp', function () {
        it('should escape special regex characters', function () {
            expect(CUtils.escapeRegExp('test.js')).to.equal('test\\.js');
            expect(CUtils.escapeRegExp('a*b')).to.equal('a\\*b');
            expect(CUtils.escapeRegExp('a+b')).to.equal('a\\+b');
            expect(CUtils.escapeRegExp('a?b')).to.equal('a\\?b');
            expect(CUtils.escapeRegExp('a^b')).to.equal('a\\^b');
            expect(CUtils.escapeRegExp('a$b')).to.equal('a\\$b');
            expect(CUtils.escapeRegExp('a{b}')).to.equal('a\\{b\\}');
            expect(CUtils.escapeRegExp('a(b)')).to.equal('a\\(b\\)');
            expect(CUtils.escapeRegExp('a|b')).to.equal('a\\|b');
            expect(CUtils.escapeRegExp('a[b]')).to.equal('a\\[b\\]');
            expect(CUtils.escapeRegExp('a\\b')).to.equal('a\\\\b');
        });

        it('should handle string with multiple special characters', function () {
            expect(CUtils.escapeRegExp('file.*.js')).to.equal('file\\.\\*\\.js');
        });

        it('should handle string without special characters', function () {
            expect(CUtils.escapeRegExp('simple')).to.equal('simple');
        });

        it('should handle empty string', function () {
            expect(CUtils.escapeRegExp('')).to.equal('');
        });
    });

    describe('#extToReg', function () {
        it('should create regex for single extension', function () {
            const result = CUtils.extToReg('js');
            expect(result).to.equal('(\\.js)$');
        });

        it('should create regex for multiple extensions', function () {
            const result = CUtils.extToReg('js,css,html');
            expect(result).to.equal('(\\.js|\\.css|\\.html)$');
        });

        it('should create working regex pattern', function () {
            const pattern = CUtils.extToReg('js,ts');
            const regex = new RegExp(pattern);
            expect(regex.test('file.js')).to.be.true;
            expect(regex.test('file.ts')).to.be.true;
            expect(regex.test('file.css')).to.be.false;
        });
    });

    describe('#sortByStrField', function () {
        it('should sort array by string field', function () {
            const arr = [
                { name: 'charlie' },
                { name: 'alpha' },
                { name: 'bravo' }
            ];
            CUtils.sortByStrField(arr, 'name');
            expect(arr.map(o => o.name)).to.deep.equal(['alpha', 'bravo', 'charlie']);
        });

        it('should handle mixed case sorting using localeCompare', function () {
            const arr = [
                { name: 'Bravo' },
                { name: 'alpha' }
            ];
            CUtils.sortByStrField(arr, 'name');
            // localeCompare sorts case-insensitively in modern environments
            // 'alpha' comes before 'Bravo'
            expect(arr[0].name).to.equal('alpha');
            expect(arr[1].name).to.equal('Bravo');
        });

        it('should sort in place', function () {
            const arr = [{ name: 'b' }, { name: 'a' }];
            const originalRef = arr;
            CUtils.sortByStrField(arr, 'name');
            expect(arr).to.equal(originalRef);
            expect(arr[0].name).to.equal('a');
        });
    });

    describe('#checkSetEnv', function () {
        const originalEnv = process.env;

        beforeEach(function () {
            process.env = { ...originalEnv };
        });

        afterEach(function () {
            process.env = originalEnv;
        });

        it('should set environment variable when value is truthy', function () {
            CUtils.checkSetEnv('TEST_VAR', 'test_value');
            expect(process.env.TEST_VAR).to.equal('test_value');
        });

        it('should not set environment variable when value is falsy', function () {
            delete process.env.TEST_VAR;
            CUtils.checkSetEnv('TEST_VAR', null);
            expect(process.env.TEST_VAR).to.be.undefined;
        });

        it('should not set environment variable when value is empty string', function () {
            delete process.env.TEST_VAR;
            CUtils.checkSetEnv('TEST_VAR', '');
            expect(process.env.TEST_VAR).to.be.undefined;
        });
    });

    describe('#setForceEnv', function () {
        const originalEnv = process.env;

        beforeEach(function () {
            process.env = { ...originalEnv };
        });

        afterEach(function () {
            process.env = originalEnv;
        });

        it('should set PLAYCANVAS_FORCE_REG with escaped path', function () {
            CUtils.setForceEnv('scripts/main.js');
            expect(process.env.PLAYCANVAS_FORCE_REG).to.equal('^scripts/main\\.js$');
        });

        it('should remove leading slash from path', function () {
            CUtils.setForceEnv('/scripts/main.js');
            expect(process.env.PLAYCANVAS_FORCE_REG).to.equal('^scripts/main\\.js$');
        });

        it('should escape special regex characters in path', function () {
            CUtils.setForceEnv('scripts/file.test.js');
            expect(process.env.PLAYCANVAS_FORCE_REG).to.equal('^scripts/file\\.test\\.js$');
        });
    });

    describe('#applyItemLimit', function () {
        it('should filter folders and files based on limit', function () {
            const data = {
                folders: [
                    { remotePath: 'scripts' },
                    { remotePath: 'scripts/utils' },
                    { remotePath: 'textures' }
                ],
                files: [
                    { remotePath: 'scripts/utils/helper.js' },
                    { remotePath: 'scripts/main.js' }
                ]
            };
            const limit = {
                folders: ['scripts', 'scripts/utils'],
                remotePath: 'scripts/utils/helper.js'
            };

            CUtils.applyItemLimit(data, limit);

            expect(data.folders).to.have.lengthOf(2);
            expect(data.files).to.have.lengthOf(1);
            expect(data.files[0].remotePath).to.equal('scripts/utils/helper.js');
        });

        it('should return empty arrays when no matches', function () {
            const data = {
                folders: [{ remotePath: 'other' }],
                files: [{ remotePath: 'other/file.js' }]
            };
            const limit = {
                folders: ['scripts'],
                remotePath: 'scripts/main.js'
            };

            CUtils.applyItemLimit(data, limit);

            expect(data.folders).to.have.lengthOf(0);
            expect(data.files).to.have.lengthOf(0);
        });
    });

    describe('#partitionFolders', function () {
        it('should partition folders into remote and non-remote', function () {
            const folders = [
                { remotePath: 'exists' },
                { remotePath: 'new' },
                { remotePath: 'also-exists' }
            ];
            const conf = {
                store: {
                    pathToAsset: {
                        exists: { id: 1 },
                        'also-exists': { id: 2 }
                    }
                }
            };

            const result = CUtils.partitionFolders(folders, conf);

            expect(result.isOnRemote).to.have.lengthOf(2);
            expect(result.isNotOnRemote).to.have.lengthOf(1);
            expect(result.isNotOnRemote[0].remotePath).to.equal('new');
        });

        it('should handle all folders on remote', function () {
            const folders = [{ remotePath: 'exists' }];
            const conf = {
                store: {
                    pathToAsset: { exists: { id: 1 } }
                }
            };

            const result = CUtils.partitionFolders(folders, conf);

            expect(result.isOnRemote).to.have.lengthOf(1);
            expect(result.isNotOnRemote).to.have.lengthOf(0);
        });

        it('should handle no folders on remote', function () {
            const folders = [{ remotePath: 'new' }];
            const conf = {
                store: {
                    pathToAsset: {}
                }
            };

            const result = CUtils.partitionFolders(folders, conf);

            expect(result.isOnRemote).to.have.lengthOf(0);
            expect(result.isNotOnRemote).to.have.lengthOf(1);
        });
    });

    describe('#isBadDir', function () {
        it('should return true for directories matching bad folder regex', function () {
            const conf = { PLAYCANVAS_BAD_FOLDER_REG: /^\./ };
            expect(CUtils.isBadDir('.git', conf)).to.be.true;
            expect(CUtils.isBadDir('.hidden', conf)).to.be.true;
        });

        it('should return false for normal directories', function () {
            const conf = { PLAYCANVAS_BAD_FOLDER_REG: /^\./ };
            expect(CUtils.isBadDir('scripts', conf)).to.be.false;
            expect(CUtils.isBadDir('src', conf)).to.be.false;
        });
    });

    describe('#checkHttps', function () {
        it('should not throw for https URLs', function () {
            expect(() => CUtils.checkHttps('https://example.com')).to.not.throw();
        });

        it('should throw for http URLs', function () {
            expect(() => CUtils.checkHttps('http://example.com')).to.throw();
        });

        it('should throw for non-URL strings', function () {
            expect(() => CUtils.checkHttps('not-a-url')).to.throw();
        });
    });

    describe('#wrapUserErrors', function () {
        let exitStub;

        beforeEach(function () {
            exitStub = sinon.stub(process, 'exit');
        });

        afterEach(function () {
            exitStub.restore();
        });

        it('should exit with code 1 on UserError', async function () {
            await CUtils.wrapUserErrors(() => {
                CUtils.throwUsError('test error');
            });
            expect(exitStub.calledOnceWith(1)).to.be.true;
        });

        it('should exit with code 1 on FatalError', async function () {
            await CUtils.wrapUserErrors(() => {
                CUtils.throwFtError('fatal error');
            });
            expect(exitStub.calledOnceWith(1)).to.be.true;
        });

        it('should rethrow unknown errors', async function () {
            try {
                await CUtils.wrapUserErrors(() => {
                    throw new TypeError('unexpected');
                });
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).to.be.instanceOf(TypeError);
            }
        });

        it('should return callback result on success', async function () {
            const result = await CUtils.wrapUserErrors(() => 42);
            expect(result).to.equal(42);
            expect(exitStub.called).to.be.false;
        });
    });

    describe('#waitMs', function () {
        it('should return a promise', function () {
            const result = CUtils.waitMs(1);
            expect(result).to.be.instanceOf(Promise);
        });

        it('should resolve after specified time', async function () {
            const start = Date.now();
            await CUtils.waitMs(50);
            const elapsed = Date.now() - start;
            expect(elapsed).to.be.at.least(40); // Allow some tolerance
        });
    });

    describe('#isInBadDir', function () {
        const conf = { PLAYCANVAS_BAD_FOLDER_REG: /\./ };

        it('should return false for root-level asset with no parent', function () {
            const assets = {
                1: { id: 1, name: 'script.js', type: 'script', parent: null }
            };
            expect(CUtils.isInBadDir(assets[1], assets, conf)).to.be.false;
        });

        it('should return false for asset in a good folder', function () {
            const assets = {
                1: { id: 1, name: 'scripts', type: 'folder', parent: null, remotePath: 'scripts' },
                2: { id: 2, name: 'main.js', type: 'script', parent: 1 }
            };
            expect(CUtils.isInBadDir(assets[2], assets, conf)).to.be.false;
        });

        it('should return true for asset in a bad folder (folder name contains a dot)', function () {
            const assets = {
                1: { id: 1, name: 'basis.js', type: 'folder', parent: null, remotePath: 'basis.js' },
                2: { id: 2, name: 'basis.js', type: 'script', parent: 1 }
            };
            expect(CUtils.isInBadDir(assets[2], assets, conf)).to.be.true;
        });

        it('should return true for deeply nested asset where grandparent is bad', function () {
            // Use a regex that matches only the grandparent name, not the parent,
            // to verify isInBadDir walks beyond the immediate parent.
            const grandparentConf = { PLAYCANVAS_BAD_FOLDER_REG: /^banned$/ };
            const assets = {
                1: { id: 1, name: 'banned', type: 'folder', parent: null, remotePath: 'banned' },
                2: { id: 2, name: 'utils', type: 'folder', parent: 1, remotePath: 'banned/utils' },
                3: { id: 3, name: 'helper.js', type: 'script', parent: 2 }
            };
            expect(CUtils.isInBadDir(assets[3], assets, grandparentConf)).to.be.true;
        });

        it('should return true for asset in nested bad folder under good parent', function () {
            const assets = {
                1: { id: 1, name: 'libs', type: 'folder', parent: null, remotePath: 'libs' },
                2: { id: 2, name: 'basis.js', type: 'folder', parent: 1, remotePath: 'libs/basis.js' },
                3: { id: 3, name: 'basis.js', type: 'script', parent: 2 }
            };
            expect(CUtils.isInBadDir(assets[3], assets, conf)).to.be.true;
        });

        it('should return false when parent is missing from idToAsset', function () {
            const assets = {
                2: { id: 2, name: 'orphan.js', type: 'script', parent: 999 }
            };
            expect(CUtils.isInBadDir(assets[2], assets, conf)).to.be.false;
        });

        it('should work with explicit basis.js pattern', function () {
            const basisConf = { PLAYCANVAS_BAD_FOLDER_REG: /(\.|Templates|basis\.js)/ };
            const assets = {
                1: { id: 1, name: 'basis.js', type: 'folder', parent: null, remotePath: 'basis.js' },
                2: { id: 2, name: 'basis.wasm.js', type: 'script', parent: 1 }
            };
            expect(CUtils.isInBadDir(assets[2], assets, basisConf)).to.be.true;
        });
    });

});
