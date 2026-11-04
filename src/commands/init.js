import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';

const CONFIG_FILE = 'pcconfig.json';
const HOME_CONFIG_FILE = '.pcconfig';

function question(rl, prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function runInit() {
    const configPath = path.join(process.cwd(), CONFIG_FILE);

    if (fs.existsSync(configPath)) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await question(rl, `${CONFIG_FILE} already exists. Overwrite? [y/n] `);
        rl.close();

        if (answer !== 'y') {
            console.log('Aborted.');
            return;
        }
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('Setting up PlayCanvas sync configuration...\n');

    const apiKey = await question(rl, 'PlayCanvas API key: ');
    const projectId = await question(rl, 'PlayCanvas project ID: ');
    const branchId = await question(rl, 'PlayCanvas branch ID: ');
    const targetDir = await question(rl, `Target directory [${process.cwd()}]: `);

    rl.close();

    const parsedProjectId = parseInt(projectId, 10);
    const playcanvasProjectId = Number.isNaN(parsedProjectId) ? projectId : parsedProjectId;
    const resolvedTargetDir = targetDir === '' ? process.cwd() : targetDir;

    // pcconfig.json is shared with everyone on the branch, so the API key and target directory go to ~/.pcconfig
    const homePath = path.join(os.homedir(), HOME_CONFIG_FILE);
    const home = fs.existsSync(homePath) ? JSON.parse(fs.readFileSync(homePath, 'utf8')) : {};
    const personal = {
        PLAYCANVAS_API_KEY: apiKey,
        PLAYCANVAS_TARGET_DIR: resolvedTargetDir
    };

    const changed = Object.keys(personal).filter((k) => home[k] !== undefined && home[k] !== personal[k]);
    if (changed.length) {
        const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await question(rl2, `${homePath} already sets ${changed.join(', ')}. Overwrite? [y/n] `);
        rl2.close();

        if (answer !== 'y') {
            changed.forEach((k) => delete personal[k]);
        }
    }

    const config = {
        PLAYCANVAS_PROJECT_ID: playcanvasProjectId,
        PLAYCANVAS_BRANCH_ID: branchId,
        PLAYCANVAS_CONVERT_TO_POW2: 0
    };

    fs.writeFileSync(homePath, `${JSON.stringify({ ...home, ...personal }, null, 2)}\n`, { mode: 0o600 });
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    console.log(`\nUpdated ${homePath}`);
    console.log(`Created ${configPath}`);
}

export { runInit };
