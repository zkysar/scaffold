// Quick test of variable substitution service
const { VariableSubstitutionService } = require('./dist/services/variable-substitution.service');

// Mock file system service (minimal required interface)
const mockFileService = {
  exists: async () => false,
  readFile: async () => '',
  writeFile: async () => {},
};

const service = new VariableSubstitutionService(mockFileService);

// Test basic substitution
const template1 = "Hello {{name}}, welcome to {{project.name}}!";
const variables1 = {
  name: "John",
  project: { name: "MyApp" }
};

console.log("Test 1 - Basic substitution:");
console.log("Template:", template1);
console.log("Variables:", JSON.stringify(variables1));
console.log("Result:", service.substituteVariables(template1, variables1));
console.log();

// Test with defaults
const template2 = "Environment: {{env|production}}, Debug: {{debug|false}}";
const variables2 = { env: "development" };

console.log("Test 2 - Default values:");
console.log("Template:", template2);
console.log("Variables:", JSON.stringify(variables2));
console.log("Result:", service.substituteVariables(template2, variables2, { throwOnMissing: false }));
console.log();

// Test transformations
const template3 = "Class: {{name|pascalCase}}, File: {{name|kebabCase}}.js";
const variables3 = { name: "my awesome component" };

console.log("Test 3 - Transformations:");
console.log("Template:", template3);
console.log("Variables:", JSON.stringify(variables3));
console.log("Result:", service.substituteVariables(template3, variables3));
console.log();

// Test special variables
const template4 = "Created: {{date}}, ID: {{uuid}}, Timestamp: {{timestamp}}";
const variables4 = {};

console.log("Test 4 - Special variables:");
console.log("Template:", template4);
console.log("Variables:", JSON.stringify(variables4));
console.log("Result:", service.substituteVariables(template4, variables4));
console.log();

// Test extract variables
const template5 = "{{project.name}} uses {{framework}} with {{settings.debug|false}}";
console.log("Test 5 - Extract variables:");
console.log("Template:", template5);
console.log("Extracted variables:", service.extractVariables(template5));