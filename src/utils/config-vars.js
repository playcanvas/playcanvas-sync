const path = require('path');
const CUtils = require('./common-utils.js');
const os = require('os');
const fs = require('fs');
const PathUtils = require('./path-utils.js');

const HOME_CONFIG_FILE = '.pcconfig';
const TARGET_CONFIG_FILE = 'pcconfig';
const CONFIG_FILE_EXT = 'json';
const PROFILE_KEY = 'PLAYCANVAS_PROFILE';

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
    'PLAYCANVAS_USE_CWD_AS_TARGET',
    'PLAYCANVAS_TARGET_SUBDIR',
    'PLAYCANVAS_INCLUDE_REG',
    'PLAYCANVAS_FORCE_REG',
    'PLAYCANVAS_DRY_RUN',
    'PLAYCANVAS_VERBOSE',
    'PLAYCANVAS_CONVERT_TO_POW2'
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

        this.fromTargetConfigFile(this.result.PLAYCANVAS_TARGET_DIR, TARGET_CONFIG_FILE);

        await this.addSubdirToTarget();

        this.fromDefaults();

        requiredFields.forEach(this.checkRequired, this);
    }

    fromConfigFile(start, name) {
        start = start || '';
        let p = path.join(start, name);
        if (!fs.existsSync(p)) {
            start = process.cwd();
            p = path.join(start, name);
        }
        const h = CUtils.jsonFileToMap(p);
        this.fromEnvOrMap(h);
    }

    fromTargetConfigFile(start, name) {
        const originalName = `${name}.${CONFIG_FILE_EXT}`;
        name = process.env[PROFILE_KEY] ? `${name}-${process.env[PROFILE_KEY]}.${CONFIG_FILE_EXT}` : `${name}.${CONFIG_FILE_EXT}`;
        let p = path.join(start, name);
        if (!fs.existsSync(p)) {
            start = process.cwd();
            p = path.join(start, name);
            if (!fs.existsSync(p)) {
                p = path.join(start, originalName);
                if (!fs.existsSync(p)) {
                    console.log("Couldn't find either the default config file [%s] or the profile-specific config file [%s] from %s", originalName, name, start);
                }
            }
        }
        const h = CUtils.jsonFileToMap(p);
        this.fromEnvOrMap(h);
    }

    async checkPrepTarg() {
        let s = this.result.PLAYCANVAS_TARGET_DIR ||
            (this.result.PLAYCANVAS_USE_CWD_AS_TARGET && process.cwd()) ||
            '';

        s = PathUtils.rmLastSlash(s);

        if (s === require.main.path) {
            CUtils.throwFtError('Error: do not use the playcanvas-sync directory as target');
        }

        await CUtils.checkTargetExists(s);

        this.result.PLAYCANVAS_TARGET_DIR = s;
    }

    fromEnvOrMap(h) {
        allConfigFields.forEach((field) => {
            this.result[field] = process.env[field] ?? h[field] ?? this.result[field];
        });
    }

    fromDefaults() {
        allConfigFields.forEach((field) => {
            this.result[field] = this.result[field] ?? fieldsWithDefaults[field];
        });
    }

    checkRequired(field) {
        if (!this.result[field]) {
            CUtils.throwUsError(`Missing config variable: ${field}`);
        }
    }

    async addSubdirToTarget() {
        let s = this.result.PLAYCANVAS_TARGET_SUBDIR;

        if (s) {
            s = PathUtils.rmLastSlash(s);

            this.result.PLAYCANVAS_TARGET_DIR = path.join(
                this.result.PLAYCANVAS_TARGET_DIR,
                s
            );

            await CUtils.checkTargetExists(this.result.PLAYCANVAS_TARGET_DIR);
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

        a.forEach((field) => {
            console.log(`${field}: ${this.result[field]}`);
        });
    }
}

module.exports = ConfigVars;
