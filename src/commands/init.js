import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CONFIG_FILE = 'pcconfig.json';

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

    const config = {
        PLAYCANVAS_API_KEY: apiKey,
        PLAYCANVAS_PROJECT_ID: parseInt(projectId, 10) || projectId,
        PLAYCANVAS_BRANCH_ID: branchId,
        PLAYCANVAS_TARGET_DIR: targetDir || process.cwd(),
        PLAYCANVAS_BAD_FILE_REG: '^\\.|~$',
        PLAYCANVAS_BAD_FOLDER_REG: '\\.',
        PLAYCANVAS_CONVERT_TO_POW2: 0
    };

    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    console.log(`\nCreated ${configPath}`);
}

export { runInit };
