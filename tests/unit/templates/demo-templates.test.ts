/**
 * Unit tests for demo templates in example-templates
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Demo Templates', () => {
  const templatesDir = path.resolve(__dirname, '../../..');

  const templates = ['react-typescript', 'nodejs-api', 'python-fastapi'];

  describe('Template Structure', () => {
    templates.forEach(templateName => {
      describe(`${templateName}`, () => {
        const templateDir = path.join(templatesDir, templateName);
        const templateJsonPath = path.join(templateDir, 'template.json');

        it('should have template.json file', () => {
          expect(fs.existsSync(templateJsonPath)).toBe(true);
        });

        it('should have valid JSON structure', () => {
          const templateData = JSON.parse(
            fs.readFileSync(templateJsonPath, 'utf8')
          );

          // Required fields
          expect(templateData).toHaveProperty('name');
          expect(templateData).toHaveProperty('version');
          expect(templateData).toHaveProperty('description');
          expect(templateData).toHaveProperty('folders');
          expect(templateData).toHaveProperty('files');
          expect(templateData).toHaveProperty('variables');
          expect(templateData).toHaveProperty('rules');
        });

        it('should have files directory', () => {
          const filesDir = path.join(templateDir, 'files');
          expect(fs.existsSync(filesDir)).toBe(true);
        });

        it('should have valid semantic version', () => {
          const templateData = JSON.parse(
            fs.readFileSync(templateJsonPath, 'utf8')
          );
          expect(templateData.version).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('should have all template files referenced in template.json', () => {
          const templateData = JSON.parse(
            fs.readFileSync(templateJsonPath, 'utf8')
          );
          const filesDir = path.join(templateDir, 'files');

          templateData.files.forEach((file: any) => {
            if (file.template) {
              const filePath = path.join(templateDir, file.template);
              expect(fs.existsSync(filePath)).toBe(true);
            }
          });
        });

        it('should have valid variable definitions', () => {
          const templateData = JSON.parse(
            fs.readFileSync(templateJsonPath, 'utf8')
          );

          templateData.variables.forEach((variable: any) => {
            expect(variable).toHaveProperty('name');
            expect(variable).toHaveProperty('description');
            expect(typeof variable.name).toBe('string');
            expect(typeof variable.description).toBe('string');

            if (variable.pattern) {
              expect(() => new RegExp(variable.pattern)).not.toThrow();
            }
          });
        });

        it('should have unique variable names', () => {
          const templateData = JSON.parse(
            fs.readFileSync(templateJsonPath, 'utf8')
          );
          const varNames = templateData.variables.map((v: any) => v.name);
          const uniqueNames = [...new Set(varNames)];

          expect(varNames.length).toBe(uniqueNames.length);
        });

        it('should have valid rules configuration', () => {
          const templateData = JSON.parse(
            fs.readFileSync(templateJsonPath, 'utf8')
          );
          const rules = templateData.rules;

          if (rules.allowedExtensions) {
            expect(Array.isArray(rules.allowedExtensions)).toBe(true);
          }

          if (rules.requiredFiles) {
            expect(Array.isArray(rules.requiredFiles)).toBe(true);
          }

          if (rules.maxFileSize) {
            expect(typeof rules.maxFileSize).toBe('number');
          }
        });
      });
    });
  });

  describe('React TypeScript Template', () => {
    const templatePath = path.join(
      templatesDir,
      'react-typescript',
      'template.json'
    );
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    it('should have React-specific files', () => {
      const filePaths = template.files.map((f: any) => f.path);
      expect(filePaths).toContain('package.json');
      expect(filePaths).toContain('tsconfig.json');
      expect(filePaths).toContain('src/App.tsx');
      expect(filePaths).toContain('src/index.tsx');
    });

    it('should have React-specific folders', () => {
      const folderPaths = template.folders.map((f: any) => f.path);
      expect(folderPaths).toContain('src');
      expect(folderPaths).toContain('src/components');
      expect(folderPaths).toContain('public');
    });

    it('should have PROJECT_NAME variable', () => {
      const projectNameVar = template.variables.find(
        (v: any) => v.name === 'PROJECT_NAME'
      );
      expect(projectNameVar).toBeDefined();
      expect(projectNameVar.pattern).toBe('^[a-z][a-z0-9-]*$');
    });
  });

  describe('Node.js API Template', () => {
    const templatePath = path.join(templatesDir, 'nodejs-api', 'template.json');
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    it('should have API-specific files', () => {
      const filePaths = template.files.map((f: any) => f.path);
      expect(filePaths).toContain('package.json');
      expect(filePaths).toContain('tsconfig.json');
      expect(filePaths).toContain('src/server.ts');
      expect(filePaths).toContain('src/app.ts');
      expect(filePaths).toContain('Dockerfile');
    });

    it('should have API-specific folders', () => {
      const folderPaths = template.folders.map((f: any) => f.path);
      expect(folderPaths).toContain('src');
      expect(folderPaths).toContain('src/routes');
      expect(folderPaths).toContain('src/middleware');
    });

    it('should have DATABASE_TYPE variable', () => {
      const dbVar = template.variables.find(
        (v: any) => v.name === 'DATABASE_TYPE'
      );
      expect(dbVar).toBeDefined();
      expect(dbVar.default).toBe('postgres');
    });

    it('should have API_PREFIX variable', () => {
      const apiPrefixVar = template.variables.find(
        (v: any) => v.name === 'API_PREFIX'
      );
      expect(apiPrefixVar).toBeDefined();
      expect(apiPrefixVar.default).toBe('/api/v1');
    });
  });

  describe('Python FastAPI Template', () => {
    const templatePath = path.join(
      templatesDir,
      'python-fastapi',
      'template.json'
    );
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    it('should have Python-specific files', () => {
      const filePaths = template.files.map((f: any) => f.path);
      expect(filePaths).toContain('requirements.txt');
      expect(filePaths).toContain('main.py');
      expect(filePaths).toContain('app/config.py');
      expect(filePaths).toContain('Dockerfile');
    });

    it('should have Python-specific folders', () => {
      const folderPaths = template.folders.map((f: any) => f.path);
      expect(folderPaths).toContain('app');
      expect(folderPaths).toContain('app/routers');
      expect(folderPaths).toContain('app/models');
    });

    it('should use snake_case file naming', () => {
      expect(template.rules.fileNaming).toBe('snake_case');
    });

    it('should have API_TITLE and API_VERSION variables', () => {
      const titleVar = template.variables.find(
        (v: any) => v.name === 'API_TITLE'
      );
      const versionVar = template.variables.find(
        (v: any) => v.name === 'API_VERSION'
      );

      expect(titleVar).toBeDefined();
      expect(versionVar).toBeDefined();
      expect(versionVar.default).toBe('1.0.0');
    });
  });

  describe('Variable Substitution', () => {
    templates.forEach(templateName => {
      it(`${templateName} should have consistent variable usage`, () => {
        const templatePath = path.join(
          templatesDir,
          templateName,
          'template.json'
        );
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
        const filesDir = path.join(templatesDir, templateName, 'files');

        const definedVars = template.variables.map((v: any) => v.name);
        const usedVars = new Set<string>();

        // Check all template files for variable usage
        template.files.forEach((file: any) => {
          if (
            file.template &&
            fs.existsSync(path.join(templatesDir, templateName, file.template))
          ) {
            const content = fs.readFileSync(
              path.join(templatesDir, templateName, file.template),
              'utf8'
            );
            const matches = content.match(/\{\{([A-Z_]+)\}\}/g);
            if (matches) {
              matches.forEach(match => {
                const varName = match.replace(/\{\{|\}\}/g, '');
                usedVars.add(varName);
              });
            }
          }
        });

        // All used variables should be defined
        usedVars.forEach(varName => {
          expect(definedVars).toContain(varName);
        });
      });
    });
  });

  describe('Template Rules', () => {
    templates.forEach(templateName => {
      const templatePath = path.join(
        templatesDir,
        templateName,
        'template.json'
      );
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

      it(`${templateName} should have valid file naming convention`, () => {
        const validNamingConventions = [
          'kebab-case',
          'snake_case',
          'camelCase',
          'PascalCase',
        ];
        if (template.rules.fileNaming) {
          expect(validNamingConventions).toContain(template.rules.fileNaming);
        }
      });

      it(`${templateName} should have required files defined`, () => {
        if (template.rules.requiredFiles) {
          expect(Array.isArray(template.rules.requiredFiles)).toBe(true);
          template.rules.requiredFiles.forEach((file: string) => {
            const fileDefinition = template.files.find(
              (f: any) => f.path === file
            );
            expect(fileDefinition).toBeDefined();
          });
        }
      });
    });
  });
});
