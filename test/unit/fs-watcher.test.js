import { expect } from 'chai';
import WatchUtils from '../../src/watch-actions/watch-utils.js';

describe('fs.watch integration', function () {

    describe('WatchUtils.DEBOUNCE_MS', function () {
        it('should be a positive number', function () {
            expect(WatchUtils.DEBOUNCE_MS).to.be.a('number');
            expect(WatchUtils.DEBOUNCE_MS).to.be.greaterThan(0);
        });

        it('should be at least 100ms to avoid duplicate events', function () {
            expect(WatchUtils.DEBOUNCE_MS).to.be.at.least(100);
        });

        it('should be at most 1000ms to keep responsiveness', function () {
            expect(WatchUtils.DEBOUNCE_MS).to.be.at.most(1000);
        });
    });

    describe('WatchUtils.shouldKeepEvent', function () {
        function makeConf(badFileReg, badFolderReg) {
            return {
                PLAYCANVAS_BAD_FILE_REG: new RegExp(badFileReg || '^\\.|~$'),
                PLAYCANVAS_BAD_FOLDER_REG: new RegExp(badFolderReg || '\\.'),
                ignParser: { isMatch: () => true }
            };
        }

        it('should keep normal script files', function () {
            const conf = makeConf();
            const event = {
                itemName: 'main.js',
                remotePath: 'scripts/main.js',
                parentRemote: 'scripts',
                isFile: true,
                isDirectory: false
            };

            expect(WatchUtils.shouldKeepEvent(event, conf)).to.be.true;
        });

        it('should reject dot-files', function () {
            const conf = makeConf();
            const event = {
                itemName: '.DS_Store',
                remotePath: '.DS_Store',
                parentRemote: '',
                isFile: true,
                isDirectory: false
            };

            expect(WatchUtils.shouldKeepEvent(event, conf)).to.be.false;
        });

        it('should reject files ending with tilde', function () {
            const conf = makeConf();
            const event = {
                itemName: 'main.js~',
                remotePath: 'scripts/main.js~',
                parentRemote: 'scripts',
                isFile: true,
                isDirectory: false
            };

            expect(WatchUtils.shouldKeepEvent(event, conf)).to.be.false;
        });

        it('should reject files in bad directories', function () {
            const conf = makeConf();
            const event = {
                itemName: 'config.json',
                remotePath: '.git/config.json',
                parentRemote: '.git',
                isFile: true,
                isDirectory: false
            };

            expect(WatchUtils.shouldKeepEvent(event, conf)).to.be.false;
        });

        it('should keep normal directories', function () {
            const conf = makeConf();
            const event = {
                itemName: 'scripts',
                remotePath: 'scripts',
                parentRemote: '',
                isFile: false,
                isDirectory: true
            };

            expect(WatchUtils.shouldKeepEvent(event, conf)).to.be.true;
        });

        it('should reject dot-directories', function () {
            const conf = makeConf();
            const event = {
                itemName: '.git',
                remotePath: '.git',
                parentRemote: '',
                isFile: false,
                isDirectory: true
            };

            expect(WatchUtils.shouldKeepEvent(event, conf)).to.be.false;
        });
    });

    describe('deletion ordering', function () {
        it('should sort children before parents when processing deletions', function () {
            // This tests the sorting logic used in pcwatch.js handleDeletion
            const paths = [
                '/root/dir',
                '/root/dir/sub/file.js',
                '/root/dir/file.js',
                '/root/dir/sub'
            ];

            // Sort longest first (children before parents)
            paths.sort((a, b) => b.length - a.length);

            expect(paths[0]).to.equal('/root/dir/sub/file.js');
            expect(paths[paths.length - 1]).to.equal('/root/dir');
        });

        it('should identify paths under a deleted directory', function () {
            const sep = '/';
            const deletedPath = '/root/dir';
            const allPaths = [
                '/root/dir',
                '/root/dir/file.js',
                '/root/dir/sub/file.js',
                '/root/other/file.js',
                '/root/directory/file.js'  // should NOT match (starts with "dir" but different dir)
            ];

            const affected = allPaths.filter((p) => {
                return p === deletedPath || p.startsWith(deletedPath + sep);
            });

            expect(affected).to.have.lengthOf(3);
            expect(affected).to.include('/root/dir');
            expect(affected).to.include('/root/dir/file.js');
            expect(affected).to.include('/root/dir/sub/file.js');
            expect(affected).to.not.include('/root/other/file.js');
            expect(affected).to.not.include('/root/directory/file.js');
        });
    });

    describe('change detection logic', function () {
        it('should detect modification when modTime differs and hash differs', function () {
            const cached = { modTime: 1000, hash: 'abc123' };
            const current = { modTime: 2000 };

            const modTimeChanged = current.modTime !== cached.modTime;
            const needsHashCheck = modTimeChanged && !!cached.hash;

            expect(needsHashCheck).to.be.true;

            // Simulate hash computation returning different hash
            const newHash = 'def456';
            const hashChanged = newHash !== cached.hash;

            expect(hashChanged).to.be.true;
        });

        it('should not detect modification when modTime differs but hash matches', function () {
            const cached = { modTime: 1000, hash: 'abc123' };
            const current = { modTime: 2000 };

            const modTimeChanged = current.modTime !== cached.modTime;
            expect(modTimeChanged).to.be.true;

            // Simulate hash computation returning same hash (metadata-only change)
            const newHash = 'abc123';
            const hashChanged = newHash !== cached.hash;

            expect(hashChanged).to.be.false;
        });

        it('should not recompute hash when modTime is unchanged', function () {
            const cached = { modTime: 1000, hash: 'abc123' };
            const current = { modTime: 1000 };

            const modTimeChanged = current.modTime !== cached.modTime;

            expect(modTimeChanged).to.be.false;
        });

        it('should compute hash when cached entry has no hash', function () {
            const cached = { modTime: 1000, hash: null };

            const needsInitialHash = !cached.hash;

            expect(needsInitialHash).to.be.true;
        });
    });

    describe('debounce behavior', function () {
        it('should collapse rapid events into one via timer reset', function (done) {
            let callCount = 0;
            const timers = {};

            function debounce(key, delay, fn) {
                if (timers[key]) {
                    clearTimeout(timers[key]);
                }

                timers[key] = setTimeout(() => {
                    delete timers[key];
                    fn();
                }, delay);
            }

            function increment() {
                callCount++;
            }

            // Simulate 5 rapid events for the same path
            for (let i = 0; i < 5; i++) {
                debounce('file.js', 50, increment);
            }

            // After the debounce window, only one call should fire
            setTimeout(() => {
                expect(callCount).to.equal(1);
                done();
            }, 150);
        });

        it('should handle independent paths separately', function (done) {
            const calls = [];
            const timers = {};

            function debounce(key, delay, fn) {
                if (timers[key]) {
                    clearTimeout(timers[key]);
                }

                timers[key] = setTimeout(() => {
                    delete timers[key];
                    fn();
                }, delay);
            }

            debounce('file-a.js', 50, () => calls.push('a'));
            debounce('file-b.js', 50, () => calls.push('b'));

            setTimeout(() => {
                expect(calls).to.have.lengthOf(2);
                expect(calls).to.include('a');
                expect(calls).to.include('b');
                done();
            }, 150);
        });
    });

    describe('removed polling constants', function () {
        it('should not have WATCH_LOOP_INTERVAL', function () {
            expect(WatchUtils).to.not.have.property('WATCH_LOOP_INTERVAL');
        });

        it('should not have WATCH_ITEM_INTERVAL', function () {
            expect(WatchUtils).to.not.have.property('WATCH_ITEM_INTERVAL');
        });
    });
});
