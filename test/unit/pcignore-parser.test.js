import { expect } from 'chai';
import PcignoreParser from '../../src/utils/pcignore-parser.js';

describe('PcignoreParser', function () {

    describe('constructor', function () {
        it('should initialize with file string and extra files', function () {
            const parser = new PcignoreParser('# comment', ['extra.js'], null);
            expect(parser.fileStr).to.equal('# comment');
            expect(parser.extraFiles).to.deep.equal(['extra.js']);
        });

        it('should initialize with extra regex', function () {
            const extraReg = /\.test\.js$/;
            const parser = new PcignoreParser('', [], extraReg);
            expect(parser.ignoreRegs).to.have.lengthOf(1);
            expect(parser.ignoreRegs[0]).to.equal(extraReg);
        });

        it('should initialize with empty ignore arrays', function () {
            const parser = new PcignoreParser('', [], null);
            expect(parser.gitLines).to.deep.equal([]);
            expect(parser.ignoreExtensions).to.deep.equal([]);
            expect(parser.ignoreRegs).to.deep.equal([]);
        });
    });

    describe('#parse', function () {
        it('should return self for chaining', function () {
            const parser = new PcignoreParser('', [], null);
            const result = parser.parse();
            expect(result).to.equal(parser);
        });
    });

    describe('#isMatch with extra files', function () {
        it('should match files in extraFiles list', function () {
            const parser = new PcignoreParser('', ['extra.js', 'config.json'], null).parse();
            expect(parser.isMatch('extra.js')).to.be.true;
            expect(parser.isMatch('config.json')).to.be.true;
            expect(parser.isMatch('other.js')).to.be.false;
        });
    });

    describe('#isMatch with ignore_all_textual_files', function () {
        it('should match all files when ignore_all_textual_files is set', function () {
            const parser = new PcignoreParser('ignore_all_textual_files', [], null).parse();
            expect(parser.ignoreAll).to.be.true;
            expect(parser.isMatch('any/path/file.js')).to.be.true;
            expect(parser.isMatch('script.txt')).to.be.true;
        });
    });

    describe('#isMatch with ignore_all_js_files', function () {
        it('should match .js files when ignore_all_js_files is set', function () {
            const parser = new PcignoreParser('ignore_all_js_files', [], null).parse();
            expect(parser.ignoreExtensions).to.include('.js');
            expect(parser.isMatch('script.js')).to.be.true;
            expect(parser.isMatch('folder/main.js')).to.be.true;
        });

        it('should not match non-js files', function () {
            const parser = new PcignoreParser('ignore_all_js_files', [], null).parse();
            expect(parser.isMatch('style.css')).to.be.false;
            expect(parser.isMatch('data.json')).to.be.false;
        });
    });

    describe('#isMatch with ignore_all_files_with_extension', function () {
        it('should match files with specified extension', function () {
            const parser = new PcignoreParser('ignore_all_files_with_extension .css', [], null).parse();
            expect(parser.ignoreExtensions).to.include('.css');
            expect(parser.isMatch('style.css')).to.be.true;
            expect(parser.isMatch('folder/theme.css')).to.be.true;
        });

        it('should match multiple extensions', function () {
            const fileStr = 'ignore_all_files_with_extension .css,.scss,.less';
            const parser = new PcignoreParser(fileStr, [], null).parse();
            expect(parser.ignoreExtensions).to.include('.css');
            expect(parser.ignoreExtensions).to.include('.scss');
            expect(parser.ignoreExtensions).to.include('.less');
            expect(parser.isMatch('style.css')).to.be.true;
            expect(parser.isMatch('theme.scss')).to.be.true;
            expect(parser.isMatch('vars.less')).to.be.true;
        });

        it('should add dot to extensions without leading dot', function () {
            const parser = new PcignoreParser('ignore_all_files_with_extension css', [], null).parse();
            expect(parser.ignoreExtensions).to.include('.css');
        });

        it('should not add extra dot to extensions with leading dot', function () {
            const parser = new PcignoreParser('ignore_all_files_with_extension .css', [], null).parse();
            expect(parser.ignoreExtensions).to.include('.css');
            expect(parser.ignoreExtensions).to.not.include('..css');
        });
    });

    describe('#isMatch with ignore_regexp', function () {
        it('should match files matching the regex', function () {
            const parser = new PcignoreParser('ignore_regexp \\.test\\.js$', [], null).parse();
            expect(parser.isMatch('script.test.js')).to.be.true;
            expect(parser.isMatch('folder/util.test.js')).to.be.true;
        });

        it('should not match files not matching the regex', function () {
            const parser = new PcignoreParser('ignore_regexp \\.test\\.js$', [], null).parse();
            expect(parser.isMatch('script.js')).to.be.false;
            expect(parser.isMatch('test.txt')).to.be.false;
        });

        it('should handle multiple regex patterns', function () {
            const fileStr = 'ignore_regexp \\.test\\.js$\nignore_regexp \\.spec\\.js$';
            const parser = new PcignoreParser(fileStr, [], null).parse();
            expect(parser.isMatch('unit.test.js')).to.be.true;
            expect(parser.isMatch('unit.spec.js')).to.be.true;
            expect(parser.isMatch('script.js')).to.be.false;
        });
    });

    describe('#isMatch with gitignore patterns', function () {
        it('should match files denied by gitignore pattern', function () {
            const parser = new PcignoreParser('*.min.js', [], null).parse();
            expect(parser.isMatch('bundle.min.js')).to.be.true;
        });

        it('should match directory patterns', function () {
            const parser = new PcignoreParser('node_modules/', [], null).parse();
            expect(parser.isMatch('node_modules/package/index.js')).to.be.true;
        });

        it('should handle negation patterns', function () {
            const fileStr = '*.js\n!important.js';
            const parser = new PcignoreParser(fileStr, [], null).parse();
            expect(parser.isMatch('script.js')).to.be.true;
            // Note: gitignore-parser behavior may vary, this tests the integration
        });

        it('should handle comment lines', function () {
            const fileStr = '# This is a comment\n*.js';
            const parser = new PcignoreParser(fileStr, [], null).parse();
            expect(parser.isMatch('script.js')).to.be.true;
        });

        it('should handle empty lines', function () {
            const fileStr = '*.js\n\n*.css';
            const parser = new PcignoreParser(fileStr, [], null).parse();
            expect(parser.isMatch('script.js')).to.be.true;
            expect(parser.isMatch('style.css')).to.be.true;
        });
    });

    describe('#isMatch with combined rules', function () {
        it('should match from any source', function () {
            const fileStr = 'ignore_all_js_files\nignore_regexp \\.test\\.';
            const parser = new PcignoreParser(fileStr, ['config.json'], null).parse();

            // From extraFiles
            expect(parser.isMatch('config.json')).to.be.true;
            // From extension
            expect(parser.isMatch('script.js')).to.be.true;
            // From regex
            expect(parser.isMatch('util.test.ts')).to.be.true;
        });
    });

    describe('#checkExtension', function () {
        it('should check if file has ignored extension', function () {
            const parser = new PcignoreParser('ignore_all_files_with_extension .js,.css', [], null).parse();
            expect(parser.checkExtension('script.js')).to.be.true;
            expect(parser.checkExtension('style.css')).to.be.true;
            expect(parser.checkExtension('data.json')).to.be.false;
        });
    });

    describe('#checkRegex', function () {
        it('should check if path matches any regex', function () {
            const parser = new PcignoreParser('ignore_regexp test', [], null).parse();
            expect(parser.checkRegex('test-file.js')).to.be.true;
            expect(parser.checkRegex('other-file.js')).to.be.false;
        });
    });

    describe('#addDotIfNeeded', function () {
        it('should add dot to extension without leading dot', function () {
            const parser = new PcignoreParser('', [], null);
            expect(parser.addDotIfNeeded('js')).to.equal('.js');
            expect(parser.addDotIfNeeded('css')).to.equal('.css');
        });

        it('should not add dot to extension with leading dot', function () {
            const parser = new PcignoreParser('', [], null);
            expect(parser.addDotIfNeeded('.js')).to.equal('.js');
            expect(parser.addDotIfNeeded('.css')).to.equal('.css');
        });
    });

    describe('source_branch_wins token', function () {
        it('should be recognized but not affect matching', function () {
            // source_branch_wins is parsed but doesn't affect isMatch
            const parser = new PcignoreParser('source_branch_wins\n*.js', [], null).parse();
            expect(parser.isMatch('script.js')).to.be.true;
        });
    });

    describe('edge cases', function () {
        it('should handle empty file string', function () {
            const parser = new PcignoreParser('', [], null).parse();
            expect(parser.isMatch('any-file.js')).to.be.false;
        });

        it('should handle whitespace-only lines', function () {
            const parser = new PcignoreParser('   \n*.js\n  ', [], null).parse();
            expect(parser.isMatch('script.js')).to.be.true;
        });

        it('should handle special token with extra whitespace', function () {
            const parser = new PcignoreParser('  ignore_all_js_files  ', [], null).parse();
            expect(parser.ignoreExtensions).to.include('.js');
        });
    });

});
