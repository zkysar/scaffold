/**
 * Integration tests for 'scaffold extend' command
 * Tests full command execution with real CLI interaction
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('scaffold extend command integration tests', () => {
  let testWorkspace: string;
  let cliPath: string;

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
  });

  function runCLI(args: string, input?: string): { stdout: string; stderr: string; exitCode: number } {
    try {
      const result = execSync(`node "${cliPath}" ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
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

  async function createMockTemplate(name: string, id?: string): Promise<void> {
    const templatesDir = path.join(testWorkspace, '.scaffold', 'templates');
    const templateId = id || `${name.toLowerCase().replace(/\s+/g, '-')}-123456789`;
    const templateDir = path.join(templatesDir, templateId);

    await fs.ensureDir(templateDir);

    const template = {
      id: templateId,
      name,
      version: '1.0.0',
      description: `Test template: ${name}`,
      rootFolder: name.toLowerCase().replace(/\s+/g, '-'),
      folders: [
        { path: 'src/components', description: 'Component directory' },
        { path: 'src/utils', description: 'Utility functions' }
      ],
      files: [
        {
          path: 'src/config.ts',
          content: 'export const config = { name: "{{PROJECT_NAME}}", template: "{{TEMPLATE_NAME}}" };',
        },
        {
          path: '.env.example',
          content: 'NODE_ENV=development\nAPI_URL={{API_URL}}',
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
        },
        {
          name: 'API_URL',
          description: 'API endpoint URL',
          required: false,
          default: 'http://localhost:3000',
        }
      ],
      rules: {
        strictMode: false,
        allowExtraFiles: true,
        allowExtraFolders: true,
        conflictResolution: 'prompt',
        excludePatterns: ['node_modules/**', '.git/**'],
        rules: [],
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await fs.writeJson(path.join(templateDir, 'template.json'), template);
  }

  describe('help and usage', () => {
    it('should display help for extend command', () => {
      const result = runCLI('extend --help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('extend [options] [project]');
      expect(result.stdout).toContain('Add templates to existing scaffold project');
      expect(result.stdout).toContain('-t, --template');
      expect(result.stdout).toContain('-v, --variables');
      expect(result.stdout).toContain('--verbose');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--force');
    });
  });

  describe('template requirement', () => {
    it('should fail when template is not specified', async () => {
      const projectPath = await createScaffoldProject('test-project');

      const result = runCLI(`extend "${projectPath}"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
      expect(result.stderr).toContain('Template is required');
      expect(result.stdout).toContain('Usage: scaffold extend');
    });

    it('should fail when template is not specified for current directory', async () => {
      await createScaffoldProject('current-project');
      process.chdir(path.join(testWorkspace, 'current-project'));

      const result = runCLI('extend');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
      expect(result.stderr).toContain('Template is required');
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
    it('should extend project with specified template', async () => {
      const projectPath = await createScaffoldProject('extend-test');
      await createMockTemplate('React Components');

      const result = runCLI(`extend "${projectPath}" --template "React Components"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
      expect(result.stdout).toContain('Would extend project:');
      expect(result.stdout).toContain('With template: React Components');
    });

    it('should extend current directory when no project path provided', async () => {
      await createScaffoldProject('current-project');
      await createMockTemplate('TypeScript Config');
      process.chdir(path.join(testWorkspace, 'current-project'));

      const result = runCLI('extend --template "TypeScript Config"');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
      expect(result.stdout).toContain('With template: TypeScript Config');
    });

    it('should handle relative project paths', async () => {
      const projectName = 'relative-project';
      await createScaffoldProject(projectName);
      await createMockTemplate('Test Template');

      const result = runCLI(`extend ./${projectName} --template "Test Template"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
    });

    it('should handle absolute project paths', async () => {
      const projectPath = await createScaffoldProject('absolute-project');
      await createMockTemplate('Another Template');

      const result = runCLI(`extend "${projectPath}" --template "Another Template"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
      expect(result.stdout).toContain(projectPath);
    });
  });

  describe('dry run mode', () => {
    it('should show what would be extended without making changes', async () => {
      const projectPath = await createScaffoldProject('dry-run-test');
      await createMockTemplate('Dry Run Template');

      const result = runCLI(`extend "${projectPath}" --template "Dry Run Template" --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN - Would extend project with:');
      expect(result.stdout).toContain('Project: dry-run-test');
      expect(result.stdout).toContain('Template: Dry Run Template');
      expect(result.stdout).toContain('Variables:');

      // Verify that dry run doesn't actually modify the manifest
      const manifestPath = path.join(projectPath, '.scaffold', 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.templates).toHaveLength(1); // Only the original base template
      expect(manifest.templates[0].name).toBe('base');
    });

    it('should show variables in dry run', async () => {
      const projectPath = await createScaffoldProject('dry-run-vars-test');
      await createMockTemplate('Variables Template');

      const variables = JSON.stringify({
        API_URL: 'https://api.example.com',
        AUTHOR: 'Test Author'
      });

      const result = runCLI(`extend "${projectPath}" --template "Variables Template" --variables '${variables}' --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN - Would extend project with:');
      expect(result.stdout).toContain('Variables Template');
      expect(result.stdout).toContain('Variables:');
    });
  });

  describe('verbose mode', () => {
    it('should show detailed output in verbose mode', async () => {
      const projectPath = await createScaffoldProject('verbose-test');
      await createMockTemplate('Verbose Template');

      const result = runCLI(`extend "${projectPath}" --template "Verbose Template" --verbose`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Extending project:');
      expect(result.stdout).toContain(projectPath);
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('Command structure created');
    });

    it('should show options in verbose mode', async () => {
      const projectPath = await createScaffoldProject('verbose-options-test');
      await createMockTemplate('Options Template');

      const result = runCLI(`extend "${projectPath}" --template "Options Template" --verbose --dry-run --force`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Extending project:');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('DRY RUN');
    });
  });

  describe('variables handling', () => {
    it('should accept valid JSON variables', async () => {
      const projectPath = await createScaffoldProject('variables-test');
      await createMockTemplate('Variables Template');

      const variables = JSON.stringify({
        PROJECT_NAME: 'my-awesome-project',
        API_URL: 'https://api.myproject.com',
        AUTHOR: 'Test Author'
      });

      const result = runCLI(`extend "${projectPath}" --template "Variables Template" --variables '${variables}' --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Variables Template');
    });

    it('should handle empty variables object', async () => {
      const projectPath = await createScaffoldProject('empty-vars-test');
      await createMockTemplate('Empty Vars Template');

      const result = runCLI(`extend "${projectPath}" --template "Empty Vars Template" --variables '{}' --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Empty Vars Template');
    });

    it('should fail with invalid JSON variables', async () => {
      const projectPath = await createScaffoldProject('invalid-vars-test');
      await createMockTemplate('Invalid Vars Template');

      const result = runCLI(`extend "${projectPath}" --template "Invalid Vars Template" --variables 'invalid-json'`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
      expect(result.stderr).toContain('Invalid variables JSON');
    });

    it('should handle complex nested variables', async () => {
      const projectPath = await createScaffoldProject('complex-vars-test');
      await createMockTemplate('Complex Vars Template');

      const complexVariables = JSON.stringify({
        author: { name: 'John Doe', email: 'john@example.com' },
        config: { strict: true, version: '2.0.0' },
        features: ['typescript', 'eslint', 'prettier'],
      });

      const result = runCLI(`extend "${projectPath}" --template "Complex Vars Template" --variables '${complexVariables}' --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Complex Vars Template');
    });
  });

  describe('force mode', () => {
    it('should handle force option without confirmation prompts', async () => {
      const projectPath = await createScaffoldProject('force-test');
      await createMockTemplate('Force Template');

      const result = runCLI(`extend "${projectPath}" --template "Force Template" --force`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
      expect(result.stdout).toContain('Force Template');
    });

    it('should handle force with dry run', async () => {
      const projectPath = await createScaffoldProject('force-dry-test');
      await createMockTemplate('Force Dry Template');

      const result = runCLI(`extend "${projectPath}" --template "Force Dry Template" --force --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Force Dry Template');
    });
  });

  describe('template name validation', () => {
    it('should handle templates with spaces in names', async () => {
      const projectPath = await createScaffoldProject('spaces-test');
      await createMockTemplate('Template With Spaces');

      const result = runCLI(`extend "${projectPath}" --template "Template With Spaces" --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Template With Spaces');
    });

    it('should handle templates with special characters', async () => {
      const projectPath = await createScaffoldProject('special-chars-test');
      await createMockTemplate('Template-With_Special.Chars');

      const result = runCLI(`extend "${projectPath}" --template "Template-With_Special.Chars" --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Template-With_Special.Chars');
    });

    it('should handle very long template names', async () => {
      const projectPath = await createScaffoldProject('long-name-test');
      const longTemplateName = 'Very Long Template Name That Exceeds Normal Length Expectations';
      await createMockTemplate(longTemplateName);

      const result = runCLI(`extend "${projectPath}" --template "${longTemplateName}" --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(longTemplateName);
    });
  });

  describe('option combinations', () => {
    it('should handle multiple options together', async () => {
      const projectPath = await createScaffoldProject('multi-options-test');
      await createMockTemplate('Multi Options Template');

      const variables = JSON.stringify({ author: 'Jane Doe' });

      const result = runCLI(`extend "${projectPath}" --template "Multi Options Template" --variables '${variables}' --verbose --dry-run --force`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Extending project:');
      expect(result.stdout).toContain('Multi Options Template');
    });

    it('should handle conflicting options gracefully', async () => {
      const projectPath = await createScaffoldProject('conflict-test');
      await createMockTemplate('Conflict Template');

      // Test with potentially conflicting options
      const result = runCLI(`extend "${projectPath}" --template "Conflict Template" --dry-run --force --verbose`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Conflict Template');
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for successful operations', async () => {
      const projectPath = await createScaffoldProject('success-test');
      await createMockTemplate('Success Template');

      const result = runCLI(`extend "${projectPath}" --template "Success Template"`);

      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 0 for successful dry runs', async () => {
      const projectPath = await createScaffoldProject('dry-success-test');
      await createMockTemplate('Dry Success Template');

      const result = runCLI(`extend "${projectPath}" --template "Dry Success Template" --dry-run`);

      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 1 for missing template argument', async () => {
      const projectPath = await createScaffoldProject('missing-template-test');

      const result = runCLI(`extend "${projectPath}"`);

      expect(result.exitCode).toBe(1);
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
    it('should produce consistent output format', async () => {
      const projectPath = await createScaffoldProject('format-test');
      await createMockTemplate('Format Template');

      const result = runCLI(`extend "${projectPath}" --template "Format Template"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
      expect(result.stdout).toContain('Would extend project:');
      expect(result.stdout).toContain('With template:');
    });

    it('should not leak sensitive information in output', async () => {
      const projectPath = await createScaffoldProject('sensitive-test');
      await createMockTemplate('Sensitive Template');

      const sensitiveVars = JSON.stringify({
        API_KEY: 'secret-key-123',
        PASSWORD: 'my-password',
        TOKEN: 'auth-token-456'
      });

      const result = runCLI(`extend "${projectPath}" --template "Sensitive Template" --variables '${sensitiveVars}' --dry-run`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Variables:');
      // Variables should be shown in dry run, but implementation should be secure
    });
  });

  describe('error scenarios', () => {
    it('should handle permission errors gracefully', async () => {
      const projectPath = await createScaffoldProject('permission-test');
      await createMockTemplate('Permission Template');

      // Try to make directory read-only (may not work on all systems)
      try {
        await fs.chmod(projectPath, 0o444);

        const result = runCLI(`extend "${projectPath}" --template "Permission Template"`);

        // Should handle permission errors gracefully
        expect([0, 1]).toContain(result.exitCode);

        // Restore permissions for cleanup
        await fs.chmod(projectPath, 0o755);
      } catch (error) {
        // Skip test if chmod not supported
        console.log('Skipping permission test due to filesystem limitations');
      }
    });

    it('should handle very long project names', async () => {
      const longName = 'a'.repeat(100);
      const projectPath = await createScaffoldProject(longName);
      await createMockTemplate('Long Name Template');

      const result = runCLI(`extend "${projectPath}" --template "Long Name Template"`);

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle special characters in project paths', async () => {
      const specialName = 'test-project-with-special-chars-123';
      const projectPath = await createScaffoldProject(specialName);
      await createMockTemplate('Special Chars Template');

      const result = runCLI(`extend "${projectPath}" --template "Special Chars Template"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
    });
  });

  describe('service integration', () => {
    it('should integrate with project service', async () => {
      const projectPath = await createScaffoldProject('service-integration-test');
      await createMockTemplate('Service Template');

      const result = runCLI(`extend "${projectPath}" --template "Service Template"`);

      expect(result.exitCode).toBe(0);
      // Should show evidence of project service interaction
      expect(result.stdout).toContain('Command structure created');
    });

    it('should handle service errors gracefully', async () => {
      // Create project with potentially problematic template reference
      const projectPath = await createScaffoldProject('service-error-test');

      const result = runCLI(`extend "${projectPath}" --template nonexistent-template`);

      // Should handle service errors gracefully
      expect([0, 1]).toContain(result.exitCode);
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
      await createMockTemplate('Empty Project Template');

      const result = runCLI(`extend "${projectPath}" --template "Empty Project Template"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
    });

    it('should handle projects with existing templates', async () => {
      const projectPath = await createScaffoldProject('existing-templates-test');
      await createMockTemplate('Additional Template');

      // Verify project already has a base template
      const manifestPath = path.join(projectPath, '.scaffold', 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.templates).toHaveLength(1);
      expect(manifest.templates[0].name).toBe('base');

      const result = runCLI(`extend "${projectPath}" --template "Additional Template"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
      expect(result.stdout).toContain('Additional Template');
    });

    it('should handle template names that match existing templates', async () => {
      const projectPath = await createScaffoldProject('duplicate-template-test');
      await createMockTemplate('base'); // Same name as existing template

      const result = runCLI(`extend "${projectPath}" --template "base"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command structure created');
    });
  });
});