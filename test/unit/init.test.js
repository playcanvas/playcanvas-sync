import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import readline from 'readline';
import { runInit } from '../../src/commands/init.js';

describe('init command', function () {
    let fsExistsStub;
    let fsWriteStub;
    let cwdStub;
    let rlStub;
    let consoleLogStub;

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
        fsExistsStub = sinon.stub(fs, 'existsSync');
        fsWriteStub = sinon.stub(fs, 'writeFileSync');
        cwdStub = sinon.stub(process, 'cwd').returns('/test/dir');
        consoleLogStub = sinon.stub(console, 'log');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('generated JSON shape', function () {
        it('should create config with all required fields', async function () {
            fsExistsStub.returns(false);

            const answers = ['test-api-key', '12345', 'branch-uuid', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            expect(fsWriteStub.calledOnce).to.be.true;
            const writtenContent = fsWriteStub.firstCall.args[1];
            const config = JSON.parse(writtenContent);

            expect(config).to.have.property('PLAYCANVAS_API_KEY', 'test-api-key');
            expect(config).to.have.property('PLAYCANVAS_PROJECT_ID', 12345);
            expect(config).to.have.property('PLAYCANVAS_BRANCH_ID', 'branch-uuid');
            expect(config).to.have.property('PLAYCANVAS_TARGET_DIR', '/test/dir');
            expect(config).to.have.property('PLAYCANVAS_BAD_FILE_REG', '^\\.|~$');
            expect(config).to.have.property('PLAYCANVAS_BAD_FOLDER_REG', '\\.');
            expect(config).to.have.property('PLAYCANVAS_CONVERT_TO_POW2', 0);
        });

        it('should parse numeric project ID as integer', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '999', 'branch', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = JSON.parse(fsWriteStub.firstCall.args[1]);
            expect(config.PLAYCANVAS_PROJECT_ID).to.equal(999);
            expect(typeof config.PLAYCANVAS_PROJECT_ID).to.equal('number');
        });

        it('should keep non-numeric project ID as string', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', 'not-a-number', 'branch', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = JSON.parse(fsWriteStub.firstCall.args[1]);
            expect(config.PLAYCANVAS_PROJECT_ID).to.equal('not-a-number');
        });

        it('should write config file with trailing newline', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const writtenContent = fsWriteStub.firstCall.args[1];
            expect(writtenContent.endsWith('\n')).to.be.true;
        });

        it('should write to pcconfig.json in current directory', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const writtenPath = fsWriteStub.firstCall.args[0];
            expect(writtenPath).to.include('pcconfig.json');
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
            rlStub = sinon.stub(readline, 'createInterface').returns(mockRl);

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
            rlStub = sinon.stub(readline, 'createInterface').returns(mockRl);

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
            rlStub = sinon.stub(readline, 'createInterface').returns(mockRl);

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
            rlStub = sinon.stub(readline, 'createInterface').returns(mockRl);

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
            rlStub = sinon.stub(readline, 'createInterface').returns(mockRl);

            await runInit();

            expect(questions[0]).to.not.include('Overwrite');
            expect(questions[0]).to.include('API key');
        });
    });

    describe('handling blank inputs', function () {
        it('should use cwd as default when target directory is blank', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = JSON.parse(fsWriteStub.firstCall.args[1]);
            expect(config.PLAYCANVAS_TARGET_DIR).to.equal('/test/dir');
        });

        it('should use provided target directory when specified', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', 'branch', '/custom/path'];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = JSON.parse(fsWriteStub.firstCall.args[1]);
            expect(config.PLAYCANVAS_TARGET_DIR).to.equal('/custom/path');
        });

        it('should trim whitespace from all inputs', async function () {
            fsExistsStub.returns(false);

            const answers = ['  key  ', '  123  ', '  branch  ', '  /path  '];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = JSON.parse(fsWriteStub.firstCall.args[1]);
            expect(config.PLAYCANVAS_API_KEY).to.equal('key');
            expect(config.PLAYCANVAS_PROJECT_ID).to.equal(123);
            expect(config.PLAYCANVAS_BRANCH_ID).to.equal('branch');
            expect(config.PLAYCANVAS_TARGET_DIR).to.equal('/path');
        });

        it('should store empty string for blank API key', async function () {
            fsExistsStub.returns(false);

            const answers = ['', '123', 'branch', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = JSON.parse(fsWriteStub.firstCall.args[1]);
            expect(config.PLAYCANVAS_API_KEY).to.equal('');
        });

        it('should store empty string for blank branch ID', async function () {
            fsExistsStub.returns(false);

            const answers = ['key', '123', '', ''];
            rlStub = sinon.stub(readline, 'createInterface').returns(createMockReadline(answers));

            await runInit();

            const config = JSON.parse(fsWriteStub.firstCall.args[1]);
            expect(config.PLAYCANVAS_BRANCH_ID).to.equal('');
        });
    });
});
