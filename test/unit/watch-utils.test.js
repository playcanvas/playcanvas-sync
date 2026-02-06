import { expect } from 'chai';
import { stub } from 'sinon';
import WatchUtils from '../../src/watch-actions/watch-utils.js';

describe('WatchUtils', function () {

    describe('#actionDeleted', function () {
        let conf;
        let deleteSpy;

        beforeEach(function () {
            deleteSpy = stub().resolves();

            conf = {
                PLAYCANVAS_BRANCH_ID: 'test-branch',
                store: {
                    idToAsset: {},
                    pathToAsset: {},
                    idToPath: {},
                    allAssets: [],
                    activeAssets: [],
                    folderAssets: [],
                    getAssetId(remotePath) {
                        const asset = this.pathToAsset[remotePath];
                        return asset ? asset.id : undefined;
                    },
                    hasChildren(folderId) {
                        return this.allAssets.some(a => a.parent === folderId);
                    },
                    handleDeletedAsset: stub()
                },
                client: {
                    methodDelete: deleteSpy
                }
            };
        });

        function addAsset(asset) {
            conf.store.allAssets.push(asset);
            conf.store.idToAsset[asset.id] = asset;
            conf.store.pathToAsset[asset.remotePath] = asset;
            conf.store.idToPath[asset.id] = asset.remotePath;
        }

        it('should delete a file asset normally', async function () {
            addAsset({ id: 10, name: 'script.js', type: 'script', parent: 1, remotePath: 'Scripts/script.js' });

            const result = await WatchUtils.actionDeleted('Scripts/script.js', conf);

            expect(result).to.be.true;
            expect(conf.store.handleDeletedAsset.calledOnceWith(10)).to.be.true;
            expect(deleteSpy.calledOnce).to.be.true;
        });

        it('should delete an empty folder', async function () {
            addAsset({ id: 1, name: 'EmptyFolder', type: 'folder', parent: null, remotePath: 'EmptyFolder' });

            const result = await WatchUtils.actionDeleted('EmptyFolder', conf);

            expect(result).to.be.true;
            expect(conf.store.handleDeletedAsset.calledOnceWith(1)).to.be.true;
            expect(deleteSpy.calledOnce).to.be.true;
        });

        it('should skip deletion of folder with unsynced children', async function () {
            addAsset({ id: 1, name: 'Mixed', type: 'folder', parent: null, remotePath: 'Mixed' });
            addAsset({ id: 3, name: 'template.pc', type: 'template', parent: 1, remotePath: 'Mixed/template.pc' });

            const result = await WatchUtils.actionDeleted('Mixed', conf);

            expect(result).to.be.false;
            expect(conf.store.handleDeletedAsset.notCalled).to.be.true;
            expect(deleteSpy.notCalled).to.be.true;
        });

        it('should skip deletion of folder with unsynced subfolder', async function () {
            addAsset({ id: 1, name: 'Parent', type: 'folder', parent: null, remotePath: 'Parent' });
            addAsset({ id: 2, name: 'Child', type: 'folder', parent: 1, remotePath: 'Parent/Child' });

            const result = await WatchUtils.actionDeleted('Parent', conf);

            expect(result).to.be.false;
            expect(conf.store.handleDeletedAsset.notCalled).to.be.true;
            expect(deleteSpy.notCalled).to.be.true;
        });

        it('should delete folder after all children are removed from store', async function () {
            addAsset({ id: 1, name: 'Scripts', type: 'folder', parent: null, remotePath: 'Scripts' });
            // No children in allAssets — they've already been deleted

            const result = await WatchUtils.actionDeleted('Scripts', conf);

            expect(result).to.be.true;
            expect(deleteSpy.calledOnce).to.be.true;
        });
    });
});
