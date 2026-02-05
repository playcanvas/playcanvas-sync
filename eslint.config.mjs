import playcanvasConfig from '@playcanvas/eslint-config';
import globals from 'globals';

export default [
    ...playcanvasConfig,
    {
        files: ['**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-await-in-loop': 'off',
            'require-atomic-updates': 'off',
            'space-unary-ops': 'off'
        }
    },
    {
        ignores: ['src/diff/diff_match_patch_uncompressed.js']
    }
];
