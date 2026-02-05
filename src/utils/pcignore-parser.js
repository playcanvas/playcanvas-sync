import path from 'path';

import gitParser from 'gitignore-parser';

import CUtils from './common-utils.js';

const specialTokenParts = [
    'ignore_all_textual_files',
    'ignore_all_js_files',
    'ignore_all_files_with_extension',
    'ignore_regexp',
    'source_branch_wins'
].join('|');

const specialTokenReg = new RegExp(`\\s*(${specialTokenParts})\\s*(\\S+)?`);

class PcignoreParser {
    constructor(fileStr, extraFiles, extraReg) {
        this.fileStr = fileStr;

        this.extraFiles = extraFiles;

        this.gitLines = [];

        this.ignoreExtensions = [];

        this.ignoreRegs = extraReg ? [extraReg] : [];
    }

    parse() {
        this.handleAllLines();

        this.setGitignore();

        return this;
    }

    isMatch(s) {
        return this.extraFiles.includes(s) ||
            this.ignoreAll ||
            this.checkExtension(s) ||
            this.checkRegex(s) ||
            this.gitignore.denies(s);
    }

    handleAllLines() {
        const a = this.fileStr.split('\n');

        a.forEach(this.handleLine, this);
    }

    handleLine(s) {
        const match = specialTokenReg.exec(s);

        if (match) {
            this.handleSpecial(match[1], match[2]);
        } else {
            this.gitLines.push(s);
        }
    }

    handleSpecial(type, val) {
        if (type === 'ignore_all_textual_files') {
            this.ignoreAll = true;

        } else if (type === 'ignore_all_js_files') {
            this.ignoreExtensions.push('.js');

        } else if (type === 'ignore_all_files_with_extension' && val) {
            this.addExtensions(val);

        } else if (type === 'ignore_regexp' && val) {
            const r = new RegExp(val);

            this.ignoreRegs.push(r);
        }
    }

    addExtensions(val) {
        let a = val.split(',');

        a = a.map(this.addDotIfNeeded, this);

        CUtils.pushArToAr(this.ignoreExtensions, a);
    }

    setGitignore() {
        const s = this.gitLines.join('\n');

        this.gitignore = gitParser.compile(s);
    }

    checkExtension(s) {
        const ext = path.extname(s);

        return this.ignoreExtensions.includes(ext);
    }

    checkRegex(s) {
        return this.ignoreRegs.some(r => r.test(s));
    }

    addDotIfNeeded(s) {
        return /^\./.test(s) ? s : `.${s}`;
    }
}

export default PcignoreParser;
