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
        files: ['test/**/*.mjs'],
        languageOptions: {
            globals: {
                ...globals.mocha,
                ...globals.node
            }
        },
        rules: {
            // Allow chai expect assertions
            'no-unused-expressions': 'off',
            // Allow function expressions for mocha (better stack traces)
            'prefer-arrow-callback': 'off',
            // Relax import ordering for tests
            'import/order': 'off'
        }
    },
    {
        ignores: ['src/diff/diff_match_patch_uncompressed.js']
    }
];
