const fs = require('fs');
const path = require('path');

// Load the burndown blocklist
const blocklistPath = path.join(__dirname, 'burndown-blocklist.json');
const blocklist = JSON.parse(fs.readFileSync(blocklistPath, 'utf8'));

// Base ESLint configuration
const baseConfig = {
  "env": {
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "import"],
  "settings": {
    "import/resolver": {
      "typescript": {
        "project": "./tsconfig.json",
        "alwaysTryTypes": true
      },
      "node": {
        "extensions": [".js", ".jsx", ".ts", ".tsx"]
      }
    },
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"]
    },
    "import/internal-regex": "^@/"
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-inferrable-types": "off",
    "prefer-const": "error",
    "no-console": "error",

    "import/no-unresolved": "error",
    "import/order": ["warn", {
      "groups": [
        "builtin",
        "external",
        "internal",
        ["parent", "sibling", "index"]
      ],
      "pathGroups": [
        {
          "pattern": "@/**",
          "group": "internal",
          "position": "before"
        }
      ],
      "pathGroupsExcludedImportTypes": ["builtin"],
      "newlines-between": "always",
      "alphabetize": {
        "order": "asc",
        "caseInsensitive": true
      }
    }],
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["../*", "../../*", "../../../*"],
          "message": "Use absolute imports with @ alias instead of relative parent imports"
        }
      ]
    }]
  },
  "overrides": [
    {
      "files": ["src/lib/logger.ts"],
      "rules": {
        "no-console": "off"
      }
    },
    {
      "files": ["**/*.test.ts", "**/*.spec.ts", "**/tests/**/*", "**/test/**/*"],
      "rules": {
        "no-console": "off"
      }
    },
    {
      "files": ["**/demo-templates/**/*", "**/templates/**/*"],
      "rules": {
        "no-console": "off"
      }
    }
  ],
  "ignorePatterns": ["dist/", "node_modules/", "*.js"]
};

// Add blocked test files to ignorePatterns for burndown
const burndownIgnorePatterns = [
  ...baseConfig.ignorePatterns,
  ...blocklist.tests.blocked
];

module.exports = {
  ...baseConfig,
  ignorePatterns: burndownIgnorePatterns
};