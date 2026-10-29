import javascriptConfig from '@playcanvas/eslint-config/javascript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
    ...javascriptConfig,
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
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node
            }
        },
        rules: {
            // Relax import ordering for tests
            'import/order': 'off'
        }
    },
    eslintConfigPrettier,
    {
        ignores: ['src/diff/diff_match_patch_uncompressed.cjs']
    }
];
