/**
 * Unit tests for TemplateCompletionProvider
 * Tests template completions and caching functionality
 */

import { TemplateCompletionProvider } from '@/services/completion-providers/template-completion-provider';
import { CompletionContext, CompletionItem, TemplateLibrary, Template } from '@/models';
import { ITemplateService } from '@/services/template-service';

// Mock template service
const mockTemplateService = {
  loadTemplates: jest.fn(),
  getTemplate: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  validateTemplate: jest.fn(),
  getTemplateVariables: jest.fn(),
  renderTemplate: jest.fn(),
} as jest.Mocked<ITemplateService>;

describe('TemplateCompletionProvider', () => {
  let provider: TemplateCompletionProvider;
  let context: CompletionContext;
  let mockTemplateLibrary: TemplateLibrary;

  beforeEach(() => {
    provider = new TemplateCompletionProvider(mockTemplateService);

    context = {
      currentWord: '',
      previousWord: null,
      commandLine: ['scaffold', 'new'],
      cursorPosition: 12,
      environmentVars: new Map(),
      currentDirectory: '/test/dir',
    };

    mockTemplateLibrary = {
      templates: [
        {
          id: 'react-app',
          name: 'react-app',
          version: '1.0.0',
          description: 'React application template',
          folders: ['src', 'public'],
          files: [],
          variables: [],
          rules: { strict: true },
          sources: [],
          dependencies: [],
          metadata: {
            author: 'test',
            tags: ['react', 'typescript'],
            license: 'MIT',
            created: new Date(),
            updated: new Date(),
          },
        },
        {
          id: 'vue-app',
          name: 'vue-app',
          version: '2.1.0',
          description: 'Vue.js application template',
          folders: ['src', 'public'],
          files: [],
          variables: [],
          rules: { strict: true },
          sources: [],
          dependencies: [],
          metadata: {
            author: 'test',
            tags: ['vue', 'typescript'],
            license: 'MIT',
            created: new Date(),
            updated: new Date(),
          },
        },
        {
          id: 'node-api',
          name: 'node-api',
          version: '1.5.0',
          description: 'Node.js API template',
          folders: ['src'],
          files: [],
          variables: [],
          rules: { strict: true },
          sources: [],
          dependencies: [],
          metadata: {
            author: 'test',
            tags: ['node', 'api'],
            license: 'MIT',
            created: new Date(),
            updated: new Date(),
          },
        },
      ],
      sources: [],
      metadata: {
        lastUpdated: new Date(),
        totalTemplates: 3,
      },
    };

    // Reset mocks
    jest.clearAllMocks();
    mockTemplateService.loadTemplates.mockResolvedValue(mockTemplateLibrary);
  });

  afterEach(() => {
    provider.clearCache();
  });

  describe('getTemplateCompletions', () => {
    it('should return all template completions for empty input', async () => {
      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        value: 'react-app',
        description: 'React application template',
        type: 'argument',
        deprecated: false,
      });
      expect(result[1]).toEqual({
        value: 'vue-app',
        description: 'Vue.js application template',
        type: 'argument',
        deprecated: false,
      });
      expect(result[2]).toEqual({
        value: 'node-api',
        description: 'Node.js API template',
        type: 'argument',
        deprecated: false,
      });
    });

    it('should filter completions by current word', async () => {
      context.currentWord = 'react';

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('react-app');
    });

    it('should filter completions by description content', async () => {
      context.currentWord = 'API';

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('node-api');
    });

    it('should return cached results on subsequent calls', async () => {
      // First call
      await provider.getTemplateCompletions(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await provider.getTemplateCompletions(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after expiry', async () => {
      // Mock short cache expiry
      (provider as any).cacheExpiry = 1; // 1ms

      // First call
      await provider.getTemplateCompletions(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Second call should reload
      await provider.getTemplateCompletions(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(2);
    });

    it('should handle template service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTemplateService.loadTemplates.mockRejectedValue(new Error('Service error'));

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load templates for completion:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle case-insensitive filtering', async () => {
      context.currentWord = 'REACT';

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('react-app');
    });

    it('should return empty array when no templates match', async () => {
      context.currentWord = 'nonexistent';

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(0);
    });

    it('should handle empty template library', async () => {
      mockTemplateService.loadTemplates.mockResolvedValue({
        templates: [],
        sources: [],
        metadata: { lastUpdated: new Date(), totalTemplates: 0 },
      });

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(0);
    });
  });

  describe('getTemplateIdCompletions', () => {
    it('should return all template IDs for empty input', async () => {
      const result = await provider.getTemplateIdCompletions(context);

      expect(result).toEqual(['react-app', 'vue-app', 'node-api']);
    });

    it('should filter template IDs by current word', async () => {
      context.currentWord = 'node';

      const result = await provider.getTemplateIdCompletions(context);

      expect(result).toEqual(['node-api']);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTemplateService.loadTemplates.mockRejectedValue(new Error('Service error'));

      const result = await provider.getTemplateIdCompletions(context);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load template IDs for completion:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should perform case-insensitive filtering', async () => {
      context.currentWord = 'VUE';

      const result = await provider.getTemplateIdCompletions(context);

      expect(result).toEqual(['vue-app']);
    });
  });

  describe('getTemplateDetails', () => {
    it('should return template details with version information', async () => {
      const result = await provider.getTemplateDetails(context);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        value: 'react-app',
        description: 'React application template (v1.0.0)',
        type: 'argument',
        deprecated: false,
      });
      expect(result[1]).toEqual({
        value: 'vue-app',
        description: 'Vue.js application template (v2.1.0)',
        type: 'argument',
        deprecated: false,
      });
    });

    it('should use cache for template details', async () => {
      // First call
      await provider.getTemplateDetails(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await provider.getTemplateDetails(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(1);
    });

    it('should filter template details by current word', async () => {
      context.currentWord = 'node';

      const result = await provider.getTemplateDetails(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('node-api');
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTemplateService.loadTemplates.mockRejectedValue(new Error('Service error'));

      const result = await provider.getTemplateDetails(context);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load template details for completion:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('templateExists', () => {
    it('should return true for existing template name', async () => {
      const result = await provider.templateExists('react-app');

      expect(result).toBe(true);
    });

    it('should return true for existing template ID', async () => {
      const result = await provider.templateExists('vue-app');

      expect(result).toBe(true);
    });

    it('should return false for non-existing template', async () => {
      const result = await provider.templateExists('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when service throws error', async () => {
      mockTemplateService.loadTemplates.mockRejectedValue(new Error('Service error'));

      const result = await provider.templateExists('react-app');

      expect(result).toBe(false);
    });
  });

  describe('getTemplate', () => {
    it('should return template by name', async () => {
      const result = await provider.getTemplate('react-app');

      expect(result).toEqual({
        value: 'react-app',
        description: 'React application template',
        type: 'argument',
        deprecated: false,
      });
    });

    it('should return template by ID', async () => {
      const result = await provider.getTemplate('vue-app');

      expect(result).toEqual({
        value: 'vue-app',
        description: 'Vue.js application template',
        type: 'argument',
        deprecated: false,
      });
    });

    it('should return null for non-existing template', async () => {
      const result = await provider.getTemplate('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when service throws error', async () => {
      mockTemplateService.loadTemplates.mockRejectedValue(new Error('Service error'));

      const result = await provider.getTemplate('react-app');

      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear completion cache', async () => {
      // First call to populate cache
      await provider.getTemplateCompletions(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(1);

      // Clear cache
      provider.clearCache();

      // Next call should reload
      await provider.getTemplateCompletions(context);
      expect(mockTemplateService.loadTemplates).toHaveBeenCalledTimes(2);
    });
  });

  describe('private filtering methods', () => {
    it('should filter completions correctly', async () => {
      const completions: CompletionItem[] = [
        { value: 'react-app', description: 'React app', type: 'argument', deprecated: false },
        { value: 'vue-app', description: 'Vue app', type: 'argument', deprecated: false },
        { value: 'angular-app', description: 'Contains react keyword', type: 'argument', deprecated: false },
      ];

      const filtered = (provider as any).filterCompletions(completions, 'react');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].value).toBe('react-app');
      expect(filtered[1].value).toBe('angular-app');
    });

    it('should return all completions for empty current word', async () => {
      const completions: CompletionItem[] = [
        { value: 'react-app', description: 'React app', type: 'argument', deprecated: false },
        { value: 'vue-app', description: 'Vue app', type: 'argument', deprecated: false },
      ];

      const filtered = (provider as any).filterCompletions(completions, '');

      expect(filtered).toHaveLength(2);
    });

    it('should filter string completions correctly', async () => {
      const completions = ['react-app', 'vue-app', 'node-api'];

      const filtered = (provider as any).filterStringCompletions(completions, 'app');

      expect(filtered).toHaveLength(2);
      expect(filtered).toContain('react-app');
      expect(filtered).toContain('vue-app');
    });

    it('should handle null description in filtering', async () => {
      const completions: CompletionItem[] = [
        { value: 'react-app', description: null, type: 'argument', deprecated: false },
        { value: 'vue-react', description: 'Vue with React', type: 'argument', deprecated: false },
      ];

      const filtered = (provider as any).filterCompletions(completions, 'react');

      expect(filtered).toHaveLength(2); // Both should match by value or description
    });
  });

  describe('edge cases', () => {
    it('should handle templates with missing descriptions', async () => {
      mockTemplateService.loadTemplates.mockResolvedValue({
        templates: [
          {
            id: 'basic',
            name: 'basic',
            version: '1.0.0',
            description: '',
            folders: [],
            files: [],
            variables: [],
            rules: { strict: true },
            sources: [],
            dependencies: [],
            metadata: {
              author: 'test',
              tags: [],
              license: 'MIT',
              created: new Date(),
              updated: new Date(),
            },
          },
        ],
        sources: [],
        metadata: { lastUpdated: new Date(), totalTemplates: 1 },
      });

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('');
    });

    it('should handle very long template lists efficiently', async () => {
      const manyTemplates = Array.from({ length: 1000 }, (_, i) => ({
        id: `template-${i}`,
        name: `template-${i}`,
        version: '1.0.0',
        description: `Template number ${i}`,
        folders: [],
        files: [],
        variables: [],
        rules: { strict: true },
        sources: [],
        dependencies: [],
        metadata: {
          author: 'test',
          tags: [],
          license: 'MIT',
          created: new Date(),
          updated: new Date(),
        },
      }));

      mockTemplateService.loadTemplates.mockResolvedValue({
        templates: manyTemplates,
        sources: [],
        metadata: { lastUpdated: new Date(), totalTemplates: 1000 },
      });

      const start = Date.now();
      const result = await provider.getTemplateCompletions(context);
      const duration = Date.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle special characters in template names', async () => {
      mockTemplateService.loadTemplates.mockResolvedValue({
        templates: [
          {
            id: 'special-@#$',
            name: 'special-@#$',
            version: '1.0.0',
            description: 'Template with special characters',
            folders: [],
            files: [],
            variables: [],
            rules: { strict: true },
            sources: [],
            dependencies: [],
            metadata: {
              author: 'test',
              tags: [],
              license: 'MIT',
              created: new Date(),
              updated: new Date(),
            },
          },
        ],
        sources: [],
        metadata: { lastUpdated: new Date(), totalTemplates: 1 },
      });

      context.currentWord = 'special-@';

      const result = await provider.getTemplateCompletions(context);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('special-@#$');
    });
  });
});