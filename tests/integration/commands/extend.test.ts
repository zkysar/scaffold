/**
 * Integration tests for 'scaffold extend' command
 * Tests full command execution with real CLI interaction
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';


import { logger } from '@/lib/logger';
describe('scaffold extend command integration tests', () => {
  let testWorkspace: string;
  let cliPath: string;
  let createdTemplateIds: string[] = [];

  beforeAll(async () => {
    // Ensure CLI is built
    cliPath = path.join(__dirname, '../../../dist/cli/index.js');
    if (!(await fs.pathExists(cliPath))) {
      execSync('npm run build', { stdio: 'inherit' });
    }
  });

  beforeEach(async () => {
    // Create a unique test workspace for each test
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'scaffold-extend-test-'));
    process.chdir(testWorkspace);
  });

  afterEach(async () => {
    // Clean up test workspace
    process.chdir('/');
    await fs.remove(testWorkspace);

    // Clean up created templates from test workspace (HOME is redirected)
    const templatesDir = path.join(testWorkspace, '.scaffold', 'templates');
    for (const templateId of createdTemplateIds) {
      const templateDir = path.join(templatesDir, templateId);
      if (await fs.pathExists(templateDir)) {
        await fs.remove(templateDir);
      }
    }

    // Clean up aliases - structure is SHA -> array of aliases
    const aliasFile = path.join(testWorkspace, '.scaffold', 'templates', 'aliases.json');
    if (await fs.pathExists(aliasFile)) {
      try {
        const data = await fs.readJson(aliasFile);
        if (data.aliases) {
          // Remove entries for our created template SHAs
          for (const templateId of createdTemplateIds) {
            delete data.aliases[templateId];
          }
          await fs.writeJson(aliasFile, data, { spaces: 2 });
        }
      } catch (error) {
        // If cleaning fails, just continue
      }
    }

    createdTemplateIds = [];
  });

  function runCLI(args: string, input?: string): { stdout: string; stderr: string; exitCode: number } {
    try {
      const result = execSync(`node "${cliPath}" ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1', HOME: testWorkspace },
        input,
        timeout: 10000,
      });
      return { stdout: result, stderr: '', exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.status || 1,
      };
    }
  }

  async function createScaffoldProject(projectName: string): Promise<string> {
    const projectPath = path.join(testWorkspace, projectName);
    await fs.ensureDir(projectPath);

    // Create .scaffold manifest
    const scaffoldDir = path.join(projectPath, '.scaffold');
    await fs.ensureDir(scaffoldDir);

    const manifest = {
      version: '1.0.0',
      projectName,
      templates: [
        {
          id: 'base-template-123',
          name: 'base',
          version: '1.0.0',
          appliedAt: '2023-01-01T00:00:00.000Z',
        },
      ],
      variables: { PROJECT_NAME: projectName },
      created: '2023-01-01T00:00:00.000Z',
      updated: '2023-01-01T00:00:00.000Z',
      history: [],
    };

    await fs.writeJson(path.join(scaffoldDir, 'manifest.json'), manifest);

    // Create some basic project structure
    await fs.ensureDir(path.join(projectPath, 'src'));
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ name: projectName, version: '1.0.0' }, null, 2)
    );
    await fs.writeFile(path.join(projectPath, 'README.md'), `# ${projectName}\n\nA scaffold-managed project.`);

    return projectPath;
  }

  async function createMockTemplate(name: string, id?: string): Promise<string> {
    const templatesDir = path.join(testWorkspace, '.scaffold', 'templates');
    const templateId = id || `${name.replace(/\s+/g, '-').toLowerCase()}-123456789`;
    const templateDir = path.join(templatesDir, templateId);

    await fs.ensureDir(templateDir);

    // Clean rootFolder name to meet validation requirements (alphanumeric, underscore, hyphen only)
    const cleanRootFolder = name.toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-') || 'template';

    const template = {
      id: templateId,
      name,
      version: '1.0.0',
      description: `Test template: ${name}`,
      rootFolder: cleanRootFolder,
      folders: [
        { path: 'src', description: 'Source directory' },
        { path: 'tests', description: 'Test directory' }
      ],
      files: [
        {
          path: 'package.json',
          content: `{"name": "{{PROJECT_NAME}}", "version": "1.0.0"}`,
        },
        {
          path: 'README.md',
          content: '# {{PROJECT_NAME}}\n\nA project scaffolded with {{TEMPLATE_NAME}}.',
        }
      ],
      variables: [
        {
          name: 'PROJECT_NAME',
          description: 'The name of the project',
          required: true,
        },
        {
          name: 'TEMPLATE_NAME',
          description: 'Template name',
          required: false,
          default: name,
        }
      ],
      rules: {
        strictMode: false,
        allowExtraFiles: true,
        allowExtraFolders: true,
        conflictResolution: 'prompt' as const,
        excludePatterns: ['node_modules/**', '.git/**'],
        rules: [],
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await fs.writeJson(path.join(templateDir, 'template.json'), template);

    // Track created template for cleanup
    createdTemplateIds.push(templateId);
    return templateId;
  }

  describe('help and usage', () => {
    it('should display help for extend command', () => {
      const result = runCLI('extend --help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('extend [options] [project]');
      expect(result.stdout).toContain('Add templates to existing project');
      expect(result.stdout).toContain('--template');
      expect(result.stdout).toContain('--variables');
      expect(result.stdout).toContain('--verbose');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--force');
    });
  });

  describe('template requirement', () => {
    it('should show no templates message when template is not specified', async () => {
      const projectPath = await createScaffoldProject('test-project');

      const result = runCLI(`extend "${projectPath}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No additional templates available to apply');
    });

    it('should show no templates message when template is not specified for current directory', async () => {
      await createScaffoldProject('current-project');
      process.chdir(path.join(testWorkspace, 'current-project'));

      const result = runCLI('extend');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No additional templates available to apply');
    });
  });

  describe('project validation', () => {
    it('should fail when project directory does not exist', () => {
      const result = runCLI('extend /nonexistent/project --template react');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
      expect(result.stderr).toContain('does not exist');
    });

    it('should fail when project is not scaffold-managed', async () => {
      // Create a regular project without scaffold manifest
      const projectPath = path.join(testWorkspace, 'regular-project');
      await fs.ensureDir(projectPath);
      await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "regular"}');

      const result = runCLI(`extend "${projectPath}" --template react`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
      expect(result.stderr).toContain('Not a scaffold-managed project');
      expect(result.stdout).toContain('No .scaffold/manifest.json file found');
      expect(result.stdout).toContain('Use "scaffold new"');
    });

    it('should handle corrupted manifest files', async () => {
      const projectPath = await createScaffoldProject('corrupted-project');

      // Corrupt the manifest
      const manifestPath = path.join(projectPath, '.scaffold', 'manifest.json');
      await fs.writeFile(manifestPath, 'invalid json {');

      const result = runCLI(`extend "${projectPath}" --template react`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
    });
  });

  describe('successful extend scenarios', () => {
    it('should handle template not found gracefully', async () => {
      const projectPath = await createScaffoldProject('extend-test');

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template"`);

      // When template is not found, CLI should exit with error
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });

    it('should handle nonexistent template for current directory', async () => {
      await createScaffoldProject('current-project');
      process.chdir(path.join(testWorkspace, 'current-project'));

      const result = runCLI('extend --template "nonexistent-template"');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });

    it('should handle relative project paths with nonexistent template', async () => {
      const projectName = 'relative-project';
      await createScaffoldProject(projectName);

      const result = runCLI(`extend ./${projectName} --template "nonexistent-template"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });

    it('should handle absolute project paths with nonexistent template', async () => {
      const projectPath = await createScaffoldProject('absolute-project');

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });

  describe('dry run mode', () => {
    it('should handle template not found in dry run mode', async () => {
      const projectPath = await createScaffoldProject('dry-run-test');

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template" --dry-run`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');

      // Verify that no changes were made to manifest
      const manifestPath = path.join(projectPath, '.scaffold', 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.templates).toHaveLength(1); // Only the original base template
      expect(manifest.templates[0].name).toBe('base');
    });
  });

  describe('verbose mode', () => {
    it('should show detailed error in verbose mode', async () => {
      const projectPath = await createScaffoldProject('verbose-test');

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template" --verbose`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });

  describe('variables handling', () => {

    it('should fail with invalid JSON variables', async () => {
      const projectPath = await createScaffoldProject('invalid-vars-test');

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template" --variables 'invalid-json'`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid variables JSON');
    });
  });

  describe('force mode', () => {
    it('should handle force option with nonexistent template', async () => {
      const projectPath = await createScaffoldProject('force-test');

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template" --force`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });

  describe('option combinations', () => {
    it('should handle multiple options together', async () => {
      const projectPath = await createScaffoldProject('multi-options-test');

      const variables = JSON.stringify({ author: 'Jane Doe' });

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template" --variables '${variables}' --verbose --dry-run --force`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });

  describe('exit codes', () => {
    it('should exit with code 1 for missing template argument', async () => {
      const projectPath = await createScaffoldProject('missing-template-test');

      const result = runCLI(`extend "${projectPath}"`);

      expect(result.exitCode).toBe(0); // No templates available, shows message
      expect(result.stdout).toContain('No additional templates available to apply');
    });

    it('should exit with code 1 for non-existent project', () => {
      const result = runCLI('extend /nonexistent/project --template test');

      expect(result.exitCode).toBe(1);
    });

    it('should exit with code 1 for non-scaffold projects', async () => {
      const projectPath = path.join(testWorkspace, 'non-scaffold');
      await fs.ensureDir(projectPath);

      const result = runCLI(`extend "${projectPath}" --template test`);

      expect(result.exitCode).toBe(1);
    });

    it('should exit with code 1 for invalid variables', async () => {
      const projectPath = await createScaffoldProject('invalid-json-test');

      const result = runCLI(`extend "${projectPath}" --template test --variables "invalid-json"`);

      expect(result.exitCode).toBe(1);
    });
  });

  describe('output format validation', () => {
    it('should handle template not found with consistent error format', async () => {
      const projectPath = await createScaffoldProject('format-test');

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });

  describe('error scenarios', () => {
    it('should handle very long project names', async () => {
      const longName = 'a'.repeat(100);
      const projectPath = await createScaffoldProject(longName);

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });

  describe('service integration', () => {
    it('should handle service errors gracefully', async () => {
      const projectPath = await createScaffoldProject('service-error-test');

      const result = runCLI(`extend "${projectPath}" --template nonexistent-template`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });

  describe('edge cases', () => {
    it('should handle empty project directory with manifest', async () => {
      const projectPath = path.join(testWorkspace, 'empty-project');
      await fs.ensureDir(projectPath);

      // Create minimal scaffold structure
      const scaffoldDir = path.join(projectPath, '.scaffold');
      await fs.ensureDir(scaffoldDir);

      const manifest = {
        version: '1.0.0',
        projectName: 'empty-project',
        templates: [],
        variables: {},
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        history: [],
      };

      await fs.writeJson(path.join(scaffoldDir, 'manifest.json'), manifest);

      const result = runCLI(`extend "${projectPath}" --template "nonexistent-template"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Template \'nonexistent-template\' not found');
    });
  });
});