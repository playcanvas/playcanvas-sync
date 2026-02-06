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
});
