import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { stub, restore } from 'sinon';

import ConfigVars from '../../src/utils/config-vars.js';

const HOME_VALUES = {
    PLAYCANVAS_API_KEY: 'home-key',
    PLAYCANVAS_BASE_URL: 'https://home.example',
    PLAYCANVAS_PROJECT_ID: 1,
    PLAYCANVAS_BRANCH_ID: 'home-branch',
    PLAYCANVAS_BAD_FILE_REG: '^\\.|~$',
    PLAYCANVAS_BAD_FOLDER_REG: '\\.'
};

describe('ConfigVars', function () {
    let root;
    let home;
    let target;
    let warn;
    let env;

    const write = (dir, name, h) => fs.writeFileSync(path.join(dir, name), JSON.stringify(h));

    const run = () => new ConfigVars().run();

    beforeEach(function () {
        root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pcsync-config-')));
        home = path.join(root, 'home');
        target = path.join(home, 'work', 'proj');
        fs.mkdirSync(target, { recursive: true });

        env = process.env;
        process.env = Object.fromEntries(Object.entries(env).filter(([k]) => !k.startsWith('PLAYCANVAS_')));

        stub(os, 'homedir').returns(home);
        stub(process, 'cwd').returns(target);
        warn = stub(console, 'warn');
        global.CONFIG_REPORTED = true;
    });

    afterEach(function () {
        restore();
        process.env = env;
        fs.rmSync(root, { recursive: true, force: true });
    });

    describe('~/.pcconfig', function () {
        it('should set every key', async function () {
            write(home, '.pcconfig', { ...HOME_VALUES, PLAYCANVAS_TARGET_DIR: target, PLAYCANVAS_FORCE_REG: 'x' });

            const conf = await run();

            expect(conf.PLAYCANVAS_API_KEY).to.equal('home-key');
            expect(conf.PLAYCANVAS_BASE_URL).to.equal('https://home.example');
            expect(conf.PLAYCANVAS_TARGET_DIR).to.equal(target);
            expect(conf.PLAYCANVAS_FORCE_REG).to.deep.equal(/x/);
            expect(warn.called).to.be.false;
        });

        it('should default the base url and file filters', async function () {
            write(home, '.pcconfig', {
                PLAYCANVAS_API_KEY: 'k',
                PLAYCANVAS_PROJECT_ID: 1,
                PLAYCANVAS_BRANCH_ID: 'b',
                PLAYCANVAS_TARGET_DIR: target
            });

            const conf = await run();

            expect(conf.PLAYCANVAS_BASE_URL).to.equal('https://playcanvas.com');
            expect(conf.PLAYCANVAS_BAD_FILE_REG.test('.bashrc')).to.be.true;
            expect(conf.PLAYCANVAS_BAD_FOLDER_REG.test('.git')).to.be.true;
        });
    });

    describe('pcconfig.json', function () {
        beforeEach(function () {
            const h = { ...HOME_VALUES, PLAYCANVAS_TARGET_DIR: target };
            delete h.PLAYCANVAS_PROJECT_ID;
            delete h.PLAYCANVAS_BRANCH_ID;
            write(home, '.pcconfig', h);
        });

        it('should set project ids, a subdirectory and texture options', async function () {
            fs.mkdirSync(path.join(target, 'src'));
            write(target, 'pcconfig.json', {
                PLAYCANVAS_PROJECT_ID: 7,
                PLAYCANVAS_BRANCH_ID: 'proj-branch',
                PLAYCANVAS_TARGET_SUBDIR: 'src',
                PLAYCANVAS_CONVERT_TO_POW2: 1
            });

            const conf = await run();

            expect(conf.PLAYCANVAS_PROJECT_ID).to.equal(7);
            expect(conf.PLAYCANVAS_BRANCH_ID).to.equal('proj-branch');
            expect(conf.PLAYCANVAS_TARGET_DIR).to.equal(path.join(target, 'src'));
            expect(conf.PLAYCANVAS_CONVERT_TO_POW2).to.equal(1);
            expect(warn.called).to.be.false;
        });

        it('should ignore the API key, host, target directory and file filters', async function () {
            write(target, 'pcconfig.json', {
                PLAYCANVAS_PROJECT_ID: 7,
                PLAYCANVAS_BRANCH_ID: 'proj-branch',
                PLAYCANVAS_API_KEY: 'proj-key',
                PLAYCANVAS_BASE_URL: 'https://proj.example',
                PLAYCANVAS_TARGET_DIR: home,
                PLAYCANVAS_FORCE_REG: 'x',
                PLAYCANVAS_INCLUDE_REG: 'x',
                PLAYCANVAS_BAD_FILE_REG: 'matchNothing',
                PLAYCANVAS_BAD_FOLDER_REG: 'matchNothing',
                PLAYCANVAS_VERBOSE: 1
            });

            const conf = await run();

            expect(conf.PLAYCANVAS_API_KEY).to.equal('home-key');
            expect(conf.PLAYCANVAS_BASE_URL).to.equal('https://home.example');
            expect(conf.PLAYCANVAS_TARGET_DIR).to.equal(target);
            expect(conf.PLAYCANVAS_FORCE_REG).to.equal(undefined);
            expect(conf.PLAYCANVAS_INCLUDE_REG).to.equal(undefined);
            expect(conf.PLAYCANVAS_BAD_FILE_REG.test('.bashrc')).to.be.true;
            expect(conf.PLAYCANVAS_BAD_FOLDER_REG.test('.git')).to.be.true;
            expect(conf.PLAYCANVAS_VERBOSE).to.equal(undefined);
            expect(conf.PLAYCANVAS_PROJECT_ID).to.equal(7);

            expect(warn.calledOnce).to.be.true;
            const msg = warn.firstCall.args[0];
            expect(msg).to.include('PLAYCANVAS_API_KEY');
            expect(msg).to.include('PLAYCANVAS_BASE_URL');
            expect(msg).to.not.include('proj-key');
            expect(msg).to.not.include('proj.example');
        });

        it('should ignore keys that only differ in case', async function () {
            write(target, 'pcconfig.json', {
                PLAYCANVAS_PROJECT_ID: 7,
                PLAYCANVAS_BRANCH_ID: 'b',
                playcanvas_base_url: 'https://proj.example',
                Playcanvas_Api_Key: 'proj-key'
            });

            const conf = await run();

            expect(conf.PLAYCANVAS_BASE_URL).to.equal('https://home.example');
            expect(conf.PLAYCANVAS_API_KEY).to.equal('home-key');
        });

        it('should apply the same rules when read from the working directory', async function () {
            const cwd = path.join(root, 'elsewhere');
            fs.mkdirSync(cwd);
            process.cwd.returns(cwd);
            write(cwd, 'pcconfig.json', {
                PLAYCANVAS_PROJECT_ID: 7,
                PLAYCANVAS_BRANCH_ID: 'b',
                PLAYCANVAS_BASE_URL: 'https://proj.example'
            });

            const conf = await run();

            expect(conf.PLAYCANVAS_PROJECT_ID).to.equal(7);
            expect(conf.PLAYCANVAS_BASE_URL).to.equal('https://home.example');
        });

        it('should reject a subdirectory outside the target', async function () {
            write(target, 'pcconfig.json', {
                PLAYCANVAS_PROJECT_ID: 7,
                PLAYCANVAS_BRANCH_ID: 'b',
                PLAYCANVAS_TARGET_SUBDIR: '../..'
            });

            const [err] = await run().then(
                () => [null],
                (e) => [e]
            );

            expect(err?.message).to.include('PLAYCANVAS_TARGET_SUBDIR');
        });

        it('should reject a subdirectory that links outside the target', async function () {
            fs.symlinkSync(home, path.join(target, 'src'));
            write(target, 'pcconfig.json', {
                PLAYCANVAS_PROJECT_ID: 7,
                PLAYCANVAS_BRANCH_ID: 'b',
                PLAYCANVAS_TARGET_SUBDIR: 'src'
            });

            const [err] = await run().then(
                () => [null],
                (e) => [e]
            );

            expect(err?.message).to.include('PLAYCANVAS_TARGET_SUBDIR');
        });
    });

    describe('.pcconfig in the working directory', function () {
        it('should only set project-level keys when ~/.pcconfig is missing', async function () {
            Object.assign(process.env, {
                PLAYCANVAS_API_KEY: 'env-key',
                PLAYCANVAS_BASE_URL: 'https://env.example',
                PLAYCANVAS_TARGET_DIR: target
            });
            write(target, '.pcconfig', {
                PLAYCANVAS_PROJECT_ID: 7,
                PLAYCANVAS_BRANCH_ID: 'b',
                PLAYCANVAS_FORCE_REG: 'x',
                PLAYCANVAS_BAD_FILE_REG: 'matchNothing'
            });

            const conf = await run();

            expect(conf.PLAYCANVAS_PROJECT_ID).to.equal(7);
            expect(conf.PLAYCANVAS_FORCE_REG).to.equal(undefined);
            expect(conf.PLAYCANVAS_BAD_FILE_REG.test('.bashrc')).to.be.true;
        });
    });

    describe('environment variables', function () {
        it('should override config files', async function () {
            write(home, '.pcconfig', { ...HOME_VALUES, PLAYCANVAS_TARGET_DIR: target });
            process.env.PLAYCANVAS_BASE_URL = 'https://env.example';

            const conf = await run();

            expect(conf.PLAYCANVAS_BASE_URL).to.equal('https://env.example');
        });
    });
});
