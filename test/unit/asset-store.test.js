import { expect } from 'chai';
import AssetStore from '../../src/asset-store.js';

describe('AssetStore', function () {

    describe('#hasChildren', function () {
        let store;

        beforeEach(function () {
            store = Object.create(AssetStore.prototype);

            store.allAssets = [
                { id: 1, name: 'Scripts', type: 'folder', parent: null },
                { id: 2, name: 'script.js', type: 'script', parent: 1 },
                { id: 3, name: 'template.pc', type: 'template', parent: 1 },
                { id: 4, name: 'EmptyFolder', type: 'folder', parent: null }
            ];
        });

        it('should return true when folder has children', function () {
            expect(store.hasChildren(1)).to.be.true;
        });

        it('should return false when folder has no children', function () {
            expect(store.hasChildren(4)).to.be.false;
        });

        it('should return false for non-existent folder id', function () {
            expect(store.hasChildren(999)).to.be.false;
        });

        it('should reflect removal of children', function () {
            // Remove child assets
            store.allAssets = store.allAssets.filter(a => a.parent !== 1);

            expect(store.hasChildren(1)).to.be.false;
        });

        it('should detect only direct children', function () {
            store.allAssets.push(
                { id: 5, name: 'SubFolder', type: 'folder', parent: 1 },
                { id: 6, name: 'deep.js', type: 'script', parent: 5 }
            );

            // Folder 1 has direct children
            expect(store.hasChildren(1)).to.be.true;

            // SubFolder (5) has direct children
            expect(store.hasChildren(5)).to.be.true;

            // Folder 4 still has no children
            expect(store.hasChildren(4)).to.be.false;
        });
    });

    describe('#addToActive', function () {
        let store;

        function createStore(conf) {
            store = Object.create(AssetStore.prototype);
            store.conf = conf;
            store.activeAssets = [];
            store.foldersWithActive = {};
            store.idToAsset = {};
            return store;
        }

        it('should exclude assets inside bad folders', function () {
            const conf = {
                PLAYCANVAS_BAD_FOLDER_REG: /\./,
                PLAYCANVAS_FORCE_REG: null,
                ignParser: { isMatch: () => true }
            };

            createStore(conf);

            const folder = { id: 1, name: 'basis.js', type: 'folder', parent: null, remotePath: 'basis.js' };
            const file = { id: 2, name: 'basis.js', type: 'script', parent: 1, remotePath: 'basis.js/basis.js' };

            store.idToAsset[1] = folder;
            store.idToAsset[2] = file;

            store.addToActive(file);

            expect(store.activeAssets).to.have.lengthOf(0);
        });

        it('should include assets in good folders', function () {
            const conf = {
                PLAYCANVAS_BAD_FOLDER_REG: /\./,
                PLAYCANVAS_FORCE_REG: null,
                ignParser: { isMatch: () => true }
            };

            createStore(conf);

            const folder = { id: 1, name: 'scripts', type: 'folder', parent: null, remotePath: 'scripts' };
            const file = { id: 2, name: 'main.js', type: 'script', parent: 1, remotePath: 'scripts/main.js' };

            store.idToAsset[1] = folder;
            store.idToAsset[2] = file;

            store.addToActive(file);

            expect(store.activeAssets).to.have.lengthOf(1);
            expect(store.activeAssets[0].name).to.equal('main.js');
        });

        it('should not mark bad folder in foldersWithActive', function () {
            const conf = {
                PLAYCANVAS_BAD_FOLDER_REG: /\./,
                PLAYCANVAS_FORCE_REG: null,
                ignParser: { isMatch: () => true }
            };

            createStore(conf);

            const folder = { id: 1, name: 'basis.js', type: 'folder', parent: null, remotePath: 'basis.js' };
            const file = { id: 2, name: 'basis.js', type: 'script', parent: 1, remotePath: 'basis.js/basis.js' };

            store.idToAsset[1] = folder;
            store.idToAsset[2] = file;

            store.addToActive(file);

            expect(store.foldersWithActive).to.not.have.property('1');
        });
    });
});
