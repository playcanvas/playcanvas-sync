import { expect } from 'chai';
import { stub, restore } from 'sinon';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { runInit } from '../../src/commands/init.js';

describe('init command', function () {
    let fsExistsStub;
    let fsWriteStub;
    let consoleLogStub;
    let homeConfig;

    const written = (file) => fsWriteStub.getCalls().find((c) => c.args[0].endsWith(file));

    // what the CLI reads: ~/.pcconfig plus pcconfig.json
    const both = () => ({
        ...JSON.parse(written('.pcconfig').args[1]),
        ...JSON.parse(written('pcconfig.json').args[1])
    });

    // Helper to create a mock readline interface
    function createMockReadline(answers) {
        let answerIndex = 0;
        return {
            question: (prompt, callback) => {
                callback(answers[answerIndex++] || '');
            },
            close: () => {}
        };
    }

    beforeEach(function () {
        fsExistsStub = stub(fs, 'existsSync');
        fsWriteStub = stub(fs, 'writeFileSync');
        stub(process, 'cwd').returns('/test/dir');
        stub(os, 'homedir').returns('/test/home');
        homeConfig = '{}';
        stub(fs, 'readFileSync').callsFake(() => homeConfig);
        consoleLogStub = stub(console, 'log');
    });

    afterEach(function () {
        restore();
    });

    describe('generated JSON shape', function () {
        it('should create config with all required fields', async function () {
            fsExistsStub.returns(false);

            const answers = ['test-api-key', '12345', 'branch-uuid', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            expect(fsWriteStub.calledTwice).to.be.true;

            expect(both()).to.deep.equal({
                PLAYCANVAS_API_KEY: 'test-api-key',
                PLAYCANVAS_PROJECT_ID: 12345,
                PLAYCANVAS_BRANCH_ID: 'branch-uuid',
                PLAYCANVAS_TARGET_DIR: '/test/dir',
                PLAYCANVAS_CONVERT_TO_POW2: 0
            });
        });

        it('should keep the API key and target directory out of pcconfig.json', async function () {
            fsExistsStub.returns(false);

            const answers = ['test-api-key', '12345', 'branch-uuid', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const home = written('.pcconfig');
            expect(home.args[0]).to.equal(path.join('/test/home', '.pcconfig'));
            expect(home.args[2]).to.deep.equal({ mode: 0o600 });
            expect(JSON.parse(home.args[1])).to.deep.equal({
                PLAYCANVAS_API_KEY: 'test-api-key',
                PLAYCANVAS_TARGET_DIR: '/test/dir'
            });
            expect(JSON.parse(written('pcconfig.json').args[1])).to.deep.equal({
                PLAYCANVAS_PROJECT_ID: 12345,
                PLAYCANVAS_BRANCH_ID: 'branch-uuid',
                PLAYCANVAS_CONVERT_TO_POW2: 0
            });
        });

        it('should merge into an existing ~/.pcconfig', async function () {
            fsExistsStub.callsFake((p) => p.endsWith('.pcconfig'));
            homeConfig = JSON.stringify({ PLAYCANVAS_BAD_FILE_REG: 'x', PLAYCANVAS_API_KEY: 'same-key' });

            const answers = ['same-key', '1', 'branch', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            expect(JSON.parse(written('.pcconfig').args[1])).to.deep.equal({
                PLAYCANVAS_BAD_FILE_REG: 'x',
                PLAYCANVAS_API_KEY: 'same-key',
                PLAYCANVAS_TARGET_DIR: '/test/dir'
            });
        });

        it('should keep existing ~/.pcconfig values unless the user confirms', async function () {
            fsExistsStub.callsFake((p) => p.endsWith('.pcconfig'));
            homeConfig = JSON.stringify({ PLAYCANVAS_API_KEY: 'old-key', PLAYCANVAS_TARGET_DIR: '/old' });

            const answers = ['new-key', '1', 'branch', '/old', 'n'];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            expect(JSON.parse(written('.pcconfig').args[1])).to.deep.equal({
                PLAYCANVAS_API_KEY: 'old-key',
                PLAYCANVAS_TARGET_DIR: '/old'
            });
        });

        it('should replace existing ~/.pcconfig values when the user confirms', async function () {
            fsExistsStub.callsFake((p) => p.endsWith('.pcconfig'));
            homeConfig = JSON.stringify({ PLAYCANVAS_API_KEY: 'old-key' });

            const answers = ['new-key', '1', 'branch', '', 'y'];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            expect(JSON.parse(written('.pcconfig').args[1])).to.have.property('PLAYCANVAS_API_KEY', 'new-key');
        });

        it('should parse numeric project ID as integer', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '999', 'branch', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = both();
            expect(config.PLAYCANVAS_PROJECT_ID).to.equal(999);
            expect(typeof config.PLAYCANVAS_PROJECT_ID).to.equal('number');
        });

        it('should keep non-numeric project ID as string', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', 'not-a-number', 'branch', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = both();
            expect(config.PLAYCANVAS_PROJECT_ID).to.equal('not-a-number');
        });

        it('should write config file with trailing newline', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            expect(written('pcconfig.json').args[1].endsWith('\n')).to.be.true;
            expect(written('.pcconfig').args[1].endsWith('\n')).to.be.true;
        });

        it('should write to pcconfig.json in current directory', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            expect(fsWriteStub.calledWith(path.join('/test/dir', 'pcconfig.json'))).to.be.true;
        });
    });

    describe('overwrite prompt behavior', function () {
        it('should prompt when config already exists', async function () {
            fsExistsStub.returns(true);

            const questions = [];
            const mockRl = {
                question: (prompt, callback) => {
                    questions.push(prompt);
                    callback('n'); // Decline overwrite
                },
                close: () => {}
            };
            stub(readline, 'createInterface').returns(mockRl);

            await runInit();

            expect(questions[0]).to.include('already exists');
            expect(questions[0]).to.include('Overwrite');
        });

        it('should abort when user declines overwrite', async function () {
            fsExistsStub.returns(true);

            const mockRl = {
                question: (prompt, callback) => {
                    callback('n');
                },
                close: () => {}
            };
            stub(readline, 'createInterface').returns(mockRl);

            await runInit();

            expect(fsWriteStub.called).to.be.false;
            expect(consoleLogStub.calledWith('Aborted.')).to.be.true;
        });

        it('should abort when user enters anything other than y', async function () {
            fsExistsStub.returns(true);

            const mockRl = {
                question: (prompt, callback) => {
                    callback('yes'); // 'yes' is not 'y'
                },
                close: () => {}
            };
            stub(readline, 'createInterface').returns(mockRl);

            await runInit();

            expect(fsWriteStub.called).to.be.false;
        });

        it('should proceed when user confirms with y', async function () {
            fsExistsStub.returns(true);

            let questionCount = 0;
            const mockRl = {
                question: (prompt, callback) => {
                    questionCount++;
                    if (questionCount === 1) {
                        callback('y'); // Confirm overwrite
                    } else {
                        callback('test-value');
                    }
                },
                close: () => {}
            };
            stub(readline, 'createInterface').returns(mockRl);

            await runInit();

            expect(fsWriteStub.called).to.be.true;
        });

        it('should not prompt when config does not exist', async function () {
            fsExistsStub.returns(false);

            const questions = [];
            const mockRl = {
                question: (prompt, callback) => {
                    questions.push(prompt);
                    callback('value');
                },
                close: () => {}
            };
            stub(readline, 'createInterface').returns(mockRl);

            await runInit();

            expect(questions[0]).to.not.include('Overwrite');
            expect(questions[0]).to.include('API key');
        });
    });

    describe('handling blank inputs', function () {
        it('should use cwd as default when target directory is blank', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = both();
            expect(config.PLAYCANVAS_TARGET_DIR).to.equal('/test/dir');
        });

        it('should use provided target directory when specified', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', '/custom/path'];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = both();
            expect(config.PLAYCANVAS_TARGET_DIR).to.equal('/custom/path');
        });

        it('should trim whitespace from all inputs', async function () {
            fsExistsStub.returns(false);

            const answers = ['  key  ', '  123  ', '  branch  ', '  /path  '];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = both();
            expect(config.PLAYCANVAS_API_KEY).to.equal('key');
            expect(config.PLAYCANVAS_PROJECT_ID).to.equal(123);
            expect(config.PLAYCANVAS_BRANCH_ID).to.equal('branch');
            expect(config.PLAYCANVAS_TARGET_DIR).to.equal('/path');
        });

        it('should store empty string for blank API key', async function () {
            fsExistsStub.returns(false);

            const answers = ['', '123', 'branch', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = both();
            expect(config.PLAYCANVAS_API_KEY).to.equal('');
        });

        it('should store empty string for blank branch ID', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', '', ''];
            stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = both();
            expect(config.PLAYCANVAS_BRANCH_ID).to.equal('');
        });
    });
});
