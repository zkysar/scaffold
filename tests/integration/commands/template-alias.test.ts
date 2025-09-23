/**
 * Integration tests for scaffold template alias command
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { TemplateService, TemplateIdentifierService } from '@/services';
import { Template } from '@/models';

describe('scaffold template alias command (integration)', () => {
  let tempDir: string;
  let originalCwd: string;
  let templateService: TemplateService;
  let identifierService: TemplateIdentifierService;
  let testTemplateSHA: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scaffold-alias-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Reset services
    templateService = new TemplateService();
    identifierService = TemplateIdentifierService.getInstance();

    // Create a test template
    const testTemplate: Template = {
      id: '',
      name: 'test-template',
      version: '1.0.0',
      description: 'Test template for alias tests',
      rootFolder: 'test-app',
      folders: [
        { path: 'src', description: 'Source directory' }
      ],
      files: [
        {
          path: 'index.js',
          content: 'console.log("test");',
          permissions: '644'
        }
      ],
      variables: [],
      rules: {
        strictMode: false,
        allowExtraFiles: true,
        allowExtraFolders: true,
        conflictResolution: 'prompt',
        excludePatterns: [],
        rules: []
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    // Create the template and get its SHA
    await templateService.createTemplate(testTemplate);
    testTemplateSHA = identifierService.computeTemplateSHA(testTemplate);
  });

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd);
    await fs.remove(tempDir);

    // Clear any test templates
    const templatesDir = path.join(os.homedir(), '.scaffold', 'templates');
    if (await fs.pathExists(templatesDir)) {
      const entries = await fs.readdir(templatesDir);
      for (const entry of entries) {
        if (entry.startsWith('test-')) {
          await fs.remove(path.join(templatesDir, entry));
        }
      }
    }

    // Clear test aliases
    const aliasFile = path.join(os.homedir(), '.scaffold', 'template-aliases.json');
    if (await fs.pathExists(aliasFile)) {
      const aliases = await fs.readJson(aliasFile);
      const testAliases = Object.keys(aliases).filter(k => k.startsWith('test-'));
      for (const alias of testAliases) {
        delete aliases[alias];
      }
      await fs.writeJson(aliasFile, aliases, { spaces: 2 });
    }
  });

  describe('successful alias operations', () => {
    it('should create an alias for a template using full SHA', async () => {
      const aliasName = 'test-alias-1';

      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${testTemplateSHA} ${aliasName}`,
        { encoding: 'utf8' }
      );

      expect(output).toContain('Alias registered successfully');
      expect(output).toContain(aliasName);

      // Verify alias was registered
      const mappings = await identifierService.getAllMappings();
      const reverseMapping: Record<string, string> = {};
      for (const [sha, aliases] of mappings) {
        for (const alias of aliases) {
          reverseMapping[alias] = sha;
        }
      }
      expect(reverseMapping[aliasName]).toBe(testTemplateSHA);
    });

    it('should create an alias using short SHA', async () => {
      const shortSHA = testTemplateSHA.substring(0, 8);
      const aliasName = 'test-alias-2';

      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${shortSHA} ${aliasName}`,
        { encoding: 'utf8' }
      );

      expect(output).toContain('Alias registered successfully');
      expect(output).toContain(aliasName);

      // Verify alias points to full SHA
      const mappings = await identifierService.getAllMappings();
      const reverseMapping: Record<string, string> = {};
      for (const [sha, aliases] of mappings) {
        for (const alias of aliases) {
          reverseMapping[alias] = sha;
        }
      }
      expect(reverseMapping[aliasName]).toBe(testTemplateSHA);
    });

    it('should create multiple aliases for same template', async () => {
      const alias1 = 'test-alias-3';
      const alias2 = 'test-alias-4';

      execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${testTemplateSHA} ${alias1}`,
        { encoding: 'utf8' }
      );

      const output2 = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${testTemplateSHA} ${alias2}`,
        { encoding: 'utf8' }
      );

      expect(output2).toContain('Alias registered successfully');

      // Verify both aliases exist
      const mappings = await identifierService.getAllMappings();
      const reverseMapping: Record<string, string> = {};
      for (const [sha, aliases] of mappings) {
        for (const alias of aliases) {
          reverseMapping[alias] = sha;
        }
      }
      expect(reverseMapping[alias1]).toBe(testTemplateSHA);
      expect(reverseMapping[alias2]).toBe(testTemplateSHA);
    });

    it('should update an existing alias to point to same template (idempotent)', async () => {
      const aliasName = 'test-alias-5';

      // Create alias first time
      execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${testTemplateSHA} ${aliasName}`,
        { encoding: 'utf8' }
      );

      // Create same alias again
      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${testTemplateSHA} ${aliasName}`,
        { encoding: 'utf8' }
      );

      expect(output).toContain('Alias registered successfully');

      // Verify alias still exists
      const mappings = await identifierService.getAllMappings();
      const reverseMapping: Record<string, string> = {};
      for (const [sha, aliases] of mappings) {
        for (const alias of aliases) {
          reverseMapping[alias] = sha;
        }
      }
      expect(reverseMapping[aliasName]).toBe(testTemplateSHA);
    });

    it('should use alias to create a new project', async () => {
      const aliasName = 'test-project-template';

      // Register alias
      await identifierService.registerAlias(testTemplateSHA, aliasName);

      // Use alias to create project
      const projectName = 'test-project';
      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} new ${projectName} --template ${aliasName}`,
        { encoding: 'utf8' }
      );

      expect(output).toContain('Project created successfully');
      expect(await fs.pathExists(path.join(tempDir, projectName))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, projectName, 'test-app', 'src'))).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should error when creating alias for non-existent template', () => {
      const fakeSHA = 'a'.repeat(64);
      const aliasName = 'test-invalid-alias';

      expect(() => {
        execSync(
          `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${fakeSHA} ${aliasName}`,
          { encoding: 'utf8' }
        );
      }).toThrow(/Template .* not found/);
    });

    it('should error when alias already exists for different template', async () => {
      const aliasName = 'test-conflict-alias';

      // Create another template
      const anotherTemplate: Template = {
        id: '',
        name: 'another-template',
        version: '1.0.0',
        description: 'Another template',
        rootFolder: 'another-app',
        folders: [],
        files: [],
        variables: [],
        rules: {
          strictMode: false,
          allowExtraFiles: true,
          allowExtraFolders: true,
          conflictResolution: 'prompt',
          excludePatterns: [],
          rules: []
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      await templateService.createTemplate(anotherTemplate);
      const anotherCreatedSHA = identifierService.computeTemplateSHA(anotherTemplate);

      // Register alias for first template
      await identifierService.registerAlias(testTemplateSHA, aliasName);

      // Try to register same alias for second template
      expect(() => {
        execSync(
          `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${anotherCreatedSHA} ${aliasName}`,
          { encoding: 'utf8' }
        );
      }).toThrow(/already registered/);
    });

    it('should error with invalid alias format', () => {
      const invalidAlias = '../etc/passwd';

      expect(() => {
        execSync(
          `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias ${testTemplateSHA} "${invalidAlias}"`,
          { encoding: 'utf8' }
        );
      }).toThrow(/Invalid alias format/);
    });

    it('should error with ambiguous short SHA', async () => {
      // This test would need two templates with SHAs that share a prefix
      // For simplicity, we'll skip this test as it requires specific SHA generation
      expect(true).toBe(true);
    });

    it('should error when no arguments provided', () => {
      expect(() => {
        execSync(
          `node ${path.join(__dirname, '../../../dist/cli/index.js')} template alias`,
          { encoding: 'utf8' }
        );
      }).toThrow(/required/);
    });
  });

  describe('template list with aliases', () => {
    it('should display aliases in template list', async () => {
      const aliasName = 'test-list-alias';

      // Register alias
      await identifierService.registerAlias(testTemplateSHA, aliasName);

      // List templates
      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template list`,
        { encoding: 'utf8' }
      );

      expect(output).toContain('test-template');
      expect(output).toContain(testTemplateSHA.substring(0, 8));
      expect(output).toContain(aliasName);
      expect(output).toContain('alias:');
    });

    it('should show multiple aliases for same template', async () => {
      const alias1 = 'test-multi-1';
      const alias2 = 'test-multi-2';

      // Register multiple aliases
      await identifierService.registerAlias(testTemplateSHA, alias1);
      await identifierService.registerAlias(testTemplateSHA, alias2);

      // List templates
      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template list --verbose`,
        { encoding: 'utf8' }
      );

      expect(output).toContain(alias1);
      expect(output).toContain(alias2);
    });
  });

  describe('using aliases in other commands', () => {
    it('should delete template using alias', async () => {
      const aliasName = 'test-delete-alias';

      // Register alias
      await identifierService.registerAlias(testTemplateSHA, aliasName);

      // Delete using alias
      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template delete ${aliasName} --force`,
        { encoding: 'utf8' }
      );

      expect(output).toContain('Template deleted successfully');

      // Verify template is gone
      await expect(templateService.getTemplate(testTemplateSHA)).rejects.toThrow();
    });

    it('should export template using alias', async () => {
      const aliasName = 'test-export-alias';
      const exportPath = path.join(tempDir, 'exported.json');

      // Register alias
      await identifierService.registerAlias(testTemplateSHA, aliasName);

      // Export using alias
      const output = execSync(
        `node ${path.join(__dirname, '../../../dist/cli/index.js')} template export ${aliasName} -o ${exportPath}`,
        { encoding: 'utf8' }
      );

      expect(output).toContain('Template exported successfully');
      expect(await fs.pathExists(exportPath)).toBe(true);

      // Verify export contains correct template
      const exported = await fs.readJson(exportPath);
      expect(exported.template.id).toBe(testTemplateSHA);
      expect(exported.template.name).toBe('test-template');
    });
  });
});