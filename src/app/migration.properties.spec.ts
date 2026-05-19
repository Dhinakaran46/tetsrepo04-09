import { globSync } from 'glob';
import { readFileSync } from 'fs';
import packageJson from '../../package.json';

// Feature: angular-17-to-21-upgrade, Property 1: Angular package version consistency
it('all @angular/* packages share the same major version', () => {
  const angularPackages = Object.entries({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).filter(([name]) => name.startsWith('@angular/'));

  const versions = angularPackages.map(([, version]) =>
    parseInt((version as string).replace(/[\^~]/, '').split('.')[0], 10)
  );

  const uniqueMajors = new Set(versions);
  expect(uniqueMajors.size).toBe(1);
});

// Feature: angular-17-to-21-upgrade, Property 2: No deprecated Angular APIs in source files
it('no TypeScript source file contains deprecated Angular APIs', () => {
  const files = globSync('src/**/*.ts', { ignore: ['**/*.spec.ts', '**/node_modules/**'] });

  const deprecatedPatterns = [
    /import\s+\{[^}]*HttpClientModule[^}]*\}\s+from\s+['"]@angular\/common\/http['"]/,
    /importProvidersFrom\([^)]*BrowserModule[^)]*\)/,
    /importProvidersFrom\([^)]*BrowserAnimationsModule[^)]*\)/,
    /import\s+\{[^}]*ComponentFactoryResolver[^}]*\}/,
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of deprecatedPatterns) {
      expect(content).not.toMatch(pattern);
    }
  }
});

// Feature: angular-17-to-21-upgrade, Property 3: No Jasmine-specific APIs in spec files
it('no spec file contains Jasmine-specific APIs incompatible with Vitest', () => {
  const specFiles = globSync('src/**/*.spec.ts');

  const jasminePatterns = [
    /jasmine\.createSpy\(/,
    /jasmine\.createSpyObj\(/,
  ];

  for (const file of specFiles) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of jasminePatterns) {
      expect(content).not.toMatch(pattern);
    }
  }
});

// Feature: angular-17-to-21-upgrade, Property 4: All @for blocks have track expressions
it('every @for block in templates has a track expression', () => {
  const templateFiles = globSync('src/**/*.html');

  const forBlockPattern = /@for\s*\([^)]+\)\s*\{/g;
  const forWithTrackPattern = /@for\s*\([^;]+;\s*track\s+[^)]+\)/;

  for (const file of templateFiles) {
    const content = readFileSync(file, 'utf-8');
    const forBlocks = content.match(forBlockPattern) || [];
    for (const block of forBlocks) {
      expect(block).toMatch(forWithTrackPattern);
    }
  }
});
