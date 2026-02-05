import { expect } from 'chai';
import TypeUtils from '../../src/utils/type-utils.js';

describe('TypeUtils', function () {

    describe('#isTextualType', function () {
        it('should return true for text type', function () {
            expect(TypeUtils.isTextualType('text')).to.be.true;
        });

        it('should return true for script type', function () {
            expect(TypeUtils.isTextualType('script')).to.be.true;
        });

        it('should return true for css type', function () {
            expect(TypeUtils.isTextualType('css')).to.be.true;
        });

        it('should return true for html type', function () {
            expect(TypeUtils.isTextualType('html')).to.be.true;
        });

        it('should return true for json type', function () {
            expect(TypeUtils.isTextualType('json')).to.be.true;
        });

        it('should return true for shader type', function () {
            expect(TypeUtils.isTextualType('shader')).to.be.true;
        });

        it('should return false for texture type', function () {
            expect(TypeUtils.isTextualType('texture')).to.be.false;
        });

        it('should return false for audio type', function () {
            expect(TypeUtils.isTextualType('audio')).to.be.false;
        });

        it('should return false for scene type', function () {
            expect(TypeUtils.isTextualType('scene')).to.be.false;
        });

        it('should return false for font type', function () {
            expect(TypeUtils.isTextualType('font')).to.be.false;
        });

        it('should return false for wasm type', function () {
            expect(TypeUtils.isTextualType('wasm')).to.be.false;
        });
    });

    describe('#isTextualFile', function () {
        // Script extensions
        it('should return truthy for .js files', function () {
            expect(TypeUtils.isTextualFile('script.js')).to.be.ok;
        });

        it('should return truthy for .mjs files', function () {
            expect(TypeUtils.isTextualFile('module.mjs')).to.be.ok;
        });

        // Text extensions
        it('should return truthy for .txt files', function () {
            expect(TypeUtils.isTextualFile('readme.txt')).to.be.ok;
        });

        it('should return truthy for .xml files', function () {
            expect(TypeUtils.isTextualFile('data.xml')).to.be.ok;
        });

        it('should return truthy for .atlas files', function () {
            expect(TypeUtils.isTextualFile('sprite.atlas')).to.be.ok;
        });

        // HTML/CSS/JSON
        it('should return truthy for .html files', function () {
            expect(TypeUtils.isTextualFile('page.html')).to.be.ok;
        });

        it('should return truthy for .css files', function () {
            expect(TypeUtils.isTextualFile('style.css')).to.be.ok;
        });

        it('should return truthy for .json files', function () {
            expect(TypeUtils.isTextualFile('config.json')).to.be.ok;
        });

        // Shader extensions
        it('should return truthy for .glsl files', function () {
            expect(TypeUtils.isTextualFile('shader.glsl')).to.be.ok;
        });

        it('should return truthy for .frag files', function () {
            expect(TypeUtils.isTextualFile('fragment.frag')).to.be.ok;
        });

        it('should return truthy for .vert files', function () {
            expect(TypeUtils.isTextualFile('vertex.vert')).to.be.ok;
        });

        // Non-textual extensions
        it('should return falsy for .png files', function () {
            expect(TypeUtils.isTextualFile('image.png')).to.not.be.ok;
        });

        it('should return falsy for .jpg files', function () {
            expect(TypeUtils.isTextualFile('photo.jpg')).to.not.be.ok;
        });

        it('should return falsy for .mp3 files', function () {
            expect(TypeUtils.isTextualFile('sound.mp3')).to.not.be.ok;
        });

        it('should return falsy for .fbx files', function () {
            expect(TypeUtils.isTextualFile('model.fbx')).to.not.be.ok;
        });

        it('should return falsy for .wasm files', function () {
            expect(TypeUtils.isTextualFile('module.wasm')).to.not.be.ok;
        });

        it('should return falsy for .ttf files', function () {
            expect(TypeUtils.isTextualFile('font.ttf')).to.not.be.ok;
        });

        // Case insensitivity
        it('should handle uppercase extensions', function () {
            expect(TypeUtils.isTextualFile('script.JS')).to.be.ok;
        });

        it('should handle mixed case extensions', function () {
            expect(TypeUtils.isTextualFile('config.Json')).to.be.ok;
        });
    });

    describe('#hasForceReg', function () {
        it('should return truthy when PLAYCANVAS_FORCE_REG is set', function () {
            const conf = { PLAYCANVAS_FORCE_REG: /\.png$/ };
            expect(TypeUtils.hasForceReg(conf)).to.be.ok;
        });

        it('should return falsy when PLAYCANVAS_FORCE_REG is null', function () {
            const conf = { PLAYCANVAS_FORCE_REG: null };
            expect(TypeUtils.hasForceReg(conf)).to.not.be.ok;
        });

        it('should return falsy when PLAYCANVAS_FORCE_REG is undefined', function () {
            const conf = {};
            expect(TypeUtils.hasForceReg(conf)).to.not.be.ok;
        });
    });

    describe('#isForceFile', function () {
        it('should return true when remotePath matches force regex', function () {
            const conf = { PLAYCANVAS_FORCE_REG: /\.png$/ };
            expect(TypeUtils.isForceFile('textures/image.png', conf)).to.be.true;
        });

        it('should return false when remotePath does not match force regex', function () {
            const conf = { PLAYCANVAS_FORCE_REG: /\.png$/ };
            expect(TypeUtils.isForceFile('scripts/main.js', conf)).to.be.false;
        });

        it('should work with complex regex patterns', function () {
            const conf = { PLAYCANVAS_FORCE_REG: /^textures\/.*\.(png|jpg)$/ };
            expect(TypeUtils.isForceFile('textures/image.png', conf)).to.be.true;
            expect(TypeUtils.isForceFile('textures/photo.jpg', conf)).to.be.true;
            expect(TypeUtils.isForceFile('other/image.png', conf)).to.be.false;
        });
    });

    describe('#isBadTextual', function () {
        const createConf = () => ({
            PLAYCANVAS_BAD_FILE_REG: /^\./,
            ignParser: {
                isMatch: () => true
            }
        });

        it('should return true for files matching bad file regex', function () {
            const conf = createConf();
            expect(TypeUtils.isBadTextual('.hidden', 'folder/.hidden', conf)).to.be.true;
        });

        it('should return true for non-textual files', function () {
            const conf = createConf();
            expect(TypeUtils.isBadTextual('image.png', 'folder/image.png', conf)).to.be.true;
        });

        it('should return true when ignParser does not match', function () {
            const conf = createConf();
            conf.ignParser.isMatch = () => false;
            expect(TypeUtils.isBadTextual('script.js', 'folder/script.js', conf)).to.be.true;
        });

        it('should return false for valid textual files', function () {
            const conf = createConf();
            expect(TypeUtils.isBadTextual('script.js', 'folder/script.js', conf)).to.be.false;
        });
    });

    describe('#isBadFile', function () {
        it('should use force regex when PLAYCANVAS_FORCE_REG is set', function () {
            const conf = {
                PLAYCANVAS_FORCE_REG: /\.png$/,
                PLAYCANVAS_BAD_FILE_REG: /^\./,
                ignParser: { isMatch: () => true }
            };
            // With force reg, non-matching files are "bad"
            expect(TypeUtils.isBadFile('script.js', 'folder/script.js', conf)).to.be.true;
            expect(TypeUtils.isBadFile('image.png', 'folder/image.png', conf)).to.be.false;
        });

        it('should use textual check when PLAYCANVAS_FORCE_REG is not set', function () {
            const conf = {
                PLAYCANVAS_FORCE_REG: null,
                PLAYCANVAS_BAD_FILE_REG: /^\./,
                ignParser: { isMatch: () => true }
            };
            expect(TypeUtils.isBadFile('script.js', 'folder/script.js', conf)).to.be.false;
            expect(TypeUtils.isBadFile('image.png', 'folder/image.png', conf)).to.be.true;
        });
    });

    describe('#isActiveTextual', function () {
        const createConf = () => ({
            ignParser: {
                isMatch: () => true
            }
        });

        it('should return true for textual type with textual extension', function () {
            const conf = createConf();
            const asset = { type: 'script', name: 'main.js', remotePath: 'scripts/main.js' };
            expect(TypeUtils.isActiveTextual(asset, conf)).to.be.true;
        });

        it('should return false for non-textual type', function () {
            const conf = createConf();
            const asset = { type: 'texture', name: 'image.png', remotePath: 'textures/image.png' };
            expect(TypeUtils.isActiveTextual(asset, conf)).to.be.false;
        });

        it('should return false when ignParser does not match', function () {
            const conf = createConf();
            conf.ignParser.isMatch = () => false;
            const asset = { type: 'script', name: 'main.js', remotePath: 'scripts/main.js' };
            expect(TypeUtils.isActiveTextual(asset, conf)).to.be.false;
        });
    });

    describe('#isActiveAsset', function () {
        it('should use force regex when PLAYCANVAS_FORCE_REG is set', function () {
            const conf = {
                PLAYCANVAS_FORCE_REG: /\.png$/,
                ignParser: { isMatch: () => true }
            };
            const pngAsset = { type: 'texture', name: 'image.png', remotePath: 'textures/image.png' };
            const jsAsset = { type: 'script', name: 'main.js', remotePath: 'scripts/main.js' };

            expect(TypeUtils.isActiveAsset(pngAsset, conf)).to.be.true;
            expect(TypeUtils.isActiveAsset(jsAsset, conf)).to.be.false;
        });

        it('should use textual check when PLAYCANVAS_FORCE_REG is not set', function () {
            const conf = {
                PLAYCANVAS_FORCE_REG: null,
                ignParser: { isMatch: () => true }
            };
            const pngAsset = { type: 'texture', name: 'image.png', remotePath: 'textures/image.png' };
            const jsAsset = { type: 'script', name: 'main.js', remotePath: 'scripts/main.js' };

            expect(TypeUtils.isActiveAsset(pngAsset, conf)).to.be.false;
            expect(TypeUtils.isActiveAsset(jsAsset, conf)).to.be.true;
        });
    });

});
