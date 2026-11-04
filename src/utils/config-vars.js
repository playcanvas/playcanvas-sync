import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import CUtils from './common-utils.js';
import PathUtils from './path-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    'PLAYCANVAS_USE_CWD_AS_TARGET',
    'PLAYCANVAS_TARGET_SUBDIR',
    'PLAYCANVAS_INCLUDE_REG',
    'PLAYCANVAS_FORCE_REG',
    'PLAYCANVAS_DRY_RUN',
    'PLAYCANVAS_VERBOSE',
    'PLAYCANVAS_CONVERT_TO_POW2'
];

const allConfigFields = requiredFields.concat(optionalFields);

// pcconfig.json is shared with everyone on the branch, so it may only set these; the API key and host,
// the target directory and the file filters come from ~/.pcconfig, environment variables or CLI options
const projectFields = [
    'PLAYCANVAS_PROJECT_ID',
    'PLAYCANVAS_BRANCH_ID',
    'PLAYCANVAS_TARGET_SUBDIR',
    'PLAYCANVAS_CONVERT_TO_POW2'
];

const fieldsWithDefaults = {
    PLAYCANVAS_BASE_URL: 'https://playcanvas.com',
    PLAYCANVAS_BAD_FILE_REG: '^\\.|~$',
    PLAYCANVAS_BAD_FOLDER_REG: '\\.'
};

const integerFields = ['PLAYCANVAS_PROJECT_ID'];

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

        this.fromConfigFile(os.homedir(), HOME_CONFIG_FILE, true);

        await this.checkPrepTarg();

        this.fromConfigFile(this.result.PLAYCANVAS_TARGET_DIR, TARGET_CONFIG_FILE, false);

        await this.addSubdirToTarget();

        this.fromDefaults();

        requiredFields.forEach(this.checkRequired, this);
    }

    fromConfigFile(start, name, trusted) {
        start = start || '';

        let p = path.join(start, name);
        if (!fs.existsSync(p)) {
            p = path.join(process.cwd(), name);

            // the working directory belongs to the project, not the user
            trusted = false;
        }
        const h = CUtils.jsonFileToMap(p);
        this.fromEnvOrMap(trusted ? h : this.projectOnly(h, p));
    }

    projectOnly(h, p) {
        const denied = Object.keys(h).filter((k) => allConfigFields.includes(k) && !projectFields.includes(k));

        if (denied.length) {
            console.warn(
                `Warning: ignoring ${denied.join(', ')} in ${p}. Set these in ~/${HOME_CONFIG_FILE}, environment variables or CLI options.`
            );
        }

        return Object.fromEntries(Object.entries(h).filter(([k]) => projectFields.includes(k)));
    }

    async checkPrepTarg() {
        let s = this.result.PLAYCANVAS_TARGET_DIR || (this.result.PLAYCANVAS_USE_CWD_AS_TARGET && process.cwd()) || '';

        s = PathUtils.rmLastSlash(s);

        if (s === path.resolve(__dirname, '../..')) {
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

            const root = this.result.PLAYCANVAS_TARGET_DIR;
            const dir = path.join(root, s);

            await CUtils.checkTargetExists(dir);

            // resolve symlinks too, so the subdirectory can't point outside the target
            const rel = path.relative(fs.realpathSync(root), fs.realpathSync(dir));
            if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
                CUtils.throwFtError(`Error: PLAYCANVAS_TARGET_SUBDIR must be inside the target directory: ${s}`);
            }

            this.result.PLAYCANVAS_TARGET_DIR = dir;
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
        const a = this.result.PLAYCANVAS_VERBOSE ? allConfigFields : [];

        a.forEach((field) => {
            console.log(`${field}: ${this.result[field]}`);
        });
    }
}

export default ConfigVars;
