const path = require('path');
const CUtils = require('./common-utils');
const os = require('os');
const PathUtils = require('./path-utils');

const HOME_CONFIG_FILE = '.pcconfig';
const TARGET_CONFIG_FILE = 'pcconfig.json';

const requiredFields = [
    'PLAYCANVAS_API_KEY',
    'PLAYCANVAS_BASE_URL',
    'PLAYCANVAS_PROJECT_ID',
    'PLAYCANVAS_BRANCH_ID',
    'PLAYCANVAS_TARGET_DIR',
    'PLAYCANVAS_BAD_FILE_REG',
    'PLAYCANVAS_BAD_FOLDER_REG'
];

const optionalFields = [
    'PLAYCANVAS_INCLUDE_REG',
    'PLAYCANVAS_FORCE_REG',
    'PLAYCANVAS_DRY_RUN',
    'PLAYCANVAS_VERBOSE'
];

const allConfigFields = requiredFields.concat(optionalFields);

const fieldsWithDefaults = {
    PLAYCANVAS_BASE_URL: 'https://playcanvas.com'
};

const integerFields = [
    'PLAYCANVAS_PROJECT_ID'
];

const regexFields = [
    'PLAYCANVAS_INCLUDE_REG',
    'PLAYCANVAS_FORCE_REG',
    'PLAYCANVAS_BAD_FILE_REG',
    'PLAYCANVAS_BAD_FOLDER_REG'
];

class ConfigVars {
    constructor() {
        this.result = {};
    }

    async run() {
        await this.setOrigVals();

        regexFields.forEach(this.makeReg, this);

        integerFields.forEach(this.makeInt, this);

        this.reportOnce();

        return this.result;
    }

    async setOrigVals() {
        this.fromEnvOrMap({});

        this.fromConfigFile(os.homedir(), HOME_CONFIG_FILE);

        await this.checkPrepTarg();

        this.fromConfigFile(this.result.PLAYCANVAS_TARGET_DIR, TARGET_CONFIG_FILE);

        this.fromDefaults();

        requiredFields.forEach(this.checkRequired, this);
    }

    fromConfigFile(start, name) {
        start = start || '';

        const p = path.join(start, name);

        const h = CUtils.jsonFileToMap(p);

        this.fromEnvOrMap(h);
    }

    async checkPrepTarg() {
        let s = this.result.PLAYCANVAS_TARGET_DIR || '';

        s = PathUtils.rmLastSlash(s);

        const stat = await PathUtils.fsWrap('stat', s);

        if (stat && stat.isDirectory) {
            this.result.PLAYCANVAS_TARGET_DIR = s;

        } else {
            CUtils.throwFtError(`Error: could not find target directory: ${s}. Check capitalization.`);
        }
    }

    fromEnvOrMap(h) {
        allConfigFields.forEach(field => {
            this.result[field] = process.env[field] || h[field] || this.result[field];
        });
    }

    fromDefaults() {
        allConfigFields.forEach(field => {
            this.result[field] = this.result[field] || fieldsWithDefaults[field];
        })
    }

    checkRequired(field) {
        if (!this.result[field]) {
            CUtils.throwUsError(`Missing config variable: ${field}`);
        }
    }

    makeReg(field) {
        const v = this.result[field];

        this.result[field] = v && new RegExp(v);
    }

    makeInt(field) {
        this.result[field] = parseInt(this.result[field], 10);
    }

    reportOnce() {
        if (!global.CONFIG_REPORTED) {
            this.reportVars();

            global.CONFIG_REPORTED = true;
        }
    }

    reportVars() {
        const a = this.result.PLAYCANVAS_VERBOSE ?
            allConfigFields : [];

        a.forEach(field => {
            console.log(`${field}: ${this.result[field]}`);
        });
    }
}

module.exports = ConfigVars;
