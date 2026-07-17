/*
 * Client source export tool.
 *
 * Copies this project to a destination folder, excluding node_modules/dist/etc.
 * Within src/app/@lcp-framework only:
 *   - strips comments
 *   - de-indents and removes blank lines (all whitespace-only, zero behavior risk)
 *   - renames local variables, function/method parameters, and catch-clause
 *     variables to short synthetic names (_v0, _v1, ...). This is scoped to
 *     symbols that Angular templates can never reference (templates only bind
 *     to `this.<member>` on the component instance, never to a local variable
 *     inside a method body), so class properties/methods are left untouched
 *     and template bindings cannot break.
 *
 * After mangling, the tool re-type-checks every touched file (reusing the
 * original project's node_modules/tsconfig for resolution) and fails loudly
 * if the rename introduced any new compiler error that wasn't already present
 * in the original file.
 *
 * Usage: node tools/export-client-source.js <destination-path>
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SRC = path.resolve(__dirname, '..');
const DEST = process.argv[2] && path.resolve(process.argv[2]);

if (!DEST) {
  console.error('Usage: node tools/export-client-source.js <destination-path>');
  process.exit(1);
}

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.angular', 'coverage', '.git', 'tmp', 'out-tsc', 'tools']);
const FRAMEWORK_REL = path.join('src', 'app', '@lcp-framework');
const ORIGINAL_FRAMEWORK_DIR = path.join(SRC, FRAMEWORK_REL);
const MANGLED_FRAMEWORK_DIR = path.join(DEST, FRAMEWORK_REL);

// TypeScript always normalizes SourceFile#fileName to forward slashes
// internally, even on Windows, so any path comparison against sourceFile
// filenames must go through this before using startsWith/equality checks.
function toPosix(p) {
  return p.split(path.sep).join('/');
}
const ORIGINAL_FRAMEWORK_DIR_POSIX = toPosix(ORIGINAL_FRAMEWORK_DIR);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (EXCLUDE_DIRS.has(base)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// ---------------------------------------------------------------------------
// Whitespace compaction: de-indent every line and drop all blank lines.
// Backtick-template-literal aware, so multi-line template literal *content*
// is left byte-for-byte intact (only real code lines get de-indented).
// ---------------------------------------------------------------------------
function compact(text) {
  const lines = text.split('\n');
  const out = [];
  let inTemplate = false;

  for (const rawLine of lines) {
    let line = rawLine;

    if (!inTemplate) {
      line = line.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
      if (line.length === 0) continue; // drop blank lines entirely
    } else {
      line = line.replace(/[ \t]+$/, '');
    }

    // Track backtick template literal state (best-effort: counts unescaped
    // backticks per line; good enough since our source has no nested
    // template literals inside `${...}` substitutions).
    let backtickCount = 0;
    for (let i = 0; i < rawLine.length; i++) {
      if (rawLine[i] === '`' && rawLine[i - 1] !== '\\') backtickCount++;
    }
    if (backtickCount % 2 === 1) inTemplate = !inTemplate;

    out.push(line);
  }

  return out.join('\n').trim() + '\n';
}

function stripHtmlComments(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  let result = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (!inSingle && !inDouble && text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end === -1) {
        result += text.slice(i);
        break;
      }
      i = end + 2;
      continue;
    }

    result += ch;
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
  }

  fs.writeFileSync(filePath, compact(result), 'utf8');
}

function stripScssComments(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let inUrl = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inUrl) {
      result += ch;
      if (ch === ')') inUrl = false;
      continue;
    }
    if (inSingle) {
      result += ch;
      if (ch === "'" && text[i - 1] !== '\\') inSingle = false;
      continue;
    }
    if (inDouble) {
      result += ch;
      if (ch === '"' && text[i - 1] !== '\\') inDouble = false;
      continue;
    }

    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length - 1 : end + 1;
      continue;
    }
    if (ch === '/' && next === '/' && text[i - 1] !== ':') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length - 1 : end - 1;
      continue;
    }

    result += ch;
    if (ch === "'") inSingle = true;
    else if (ch === '"') inDouble = true;
    else if (ch === '(' && result.slice(-4, -1).toLowerCase() === 'url') inUrl = true;
  }

  fs.writeFileSync(filePath, compact(result), 'utf8');
}

// ---------------------------------------------------------------------------
// TypeScript: comment removal + local-variable/parameter mangling, done via
// the real type checker so renames are scoped precisely to safe symbols.
// ---------------------------------------------------------------------------
function isModuleTopLevelVariable(decl) {
  let n = decl.parent;
  if (!ts.isVariableDeclarationList(n)) return false;
  n = n.parent;
  return ts.isVariableStatement(n) && ts.isSourceFile(n.parent);
}

function isParameterProperty(param) {
  if (!ts.canHaveModifiers(param)) return false;
  const modifiers = ts.getModifiers(param) || [];
  return modifiers.some(
    (m) =>
      m.kind === ts.SyntaxKind.PublicKeyword ||
      m.kind === ts.SyntaxKind.PrivateKeyword ||
      m.kind === ts.SyntaxKind.ProtectedKeyword ||
      m.kind === ts.SyntaxKind.ReadonlyKeyword
  );
}

function collectRenameMap(sourceFile, checker) {
  const renameMap = new Map();
  let counter = 0;

  function assign(nameNode) {
    if (!nameNode || !ts.isIdentifier(nameNode)) return;
    const symbol = checker.getSymbolAtLocation(nameNode);
    if (!symbol || renameMap.has(symbol)) return;
    if (!symbol.declarations || symbol.declarations.length !== 1) return;
    renameMap.set(symbol, `_v${counter++}`);
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && !isModuleTopLevelVariable(node)) {
      assign(node.name);
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name) && node.name.text !== 'this' && !isParameterProperty(node)) {
      assign(node.name);
    } else if (ts.isCatchClause(node) && node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
      assign(node.variableDeclaration.name);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return renameMap;
}

function makeRenameTransformer(renameMap, checker) {
  return (context) => {
    const visit = (node) => {
      if (ts.isShorthandPropertyAssignment(node)) {
        const valueSymbol = checker.getShorthandAssignmentValueSymbol(node);
        const newName = valueSymbol && renameMap.get(valueSymbol);
        if (newName) {
          return ts.factory.createPropertyAssignment(ts.factory.createIdentifier(node.name.text), ts.factory.createIdentifier(newName));
        }
        return node;
      }
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        const newName = symbol && renameMap.get(symbol);
        if (newName) {
          return ts.factory.createIdentifier(newName);
        }
        return node;
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (sourceFile) => ts.visitNode(sourceFile, visit);
  };
}

function loadProgram() {
  const configPath = path.join(SRC, 'tsconfig.app.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, SRC);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  return { program, options: parsed.options };
}

function processTsFile(originalFilePath, destFilePath, program, checker) {
  const sourceFile = program.getSourceFile(originalFilePath);
  if (!sourceFile) {
    console.warn(`Not part of the program (skipping mangle, comment-strip only): ${originalFilePath}`);
    const raw = fs.readFileSync(originalFilePath, 'utf8');
    const fallback = ts.createSourceFile(originalFilePath, raw, ts.ScriptTarget.Latest, true);
    const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
    fs.writeFileSync(destFilePath, compact(printer.printFile(fallback)), 'utf8');
    return;
  }

  const renameMap = collectRenameMap(sourceFile, checker);
  const transformer = makeRenameTransformer(renameMap, checker);
  const result = ts.transform(sourceFile, [transformer]);
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const printed = printer.printFile(result.transformed[0]);
  result.dispose();
  fs.writeFileSync(destFilePath, compact(printed), 'utf8');
}

function walkAndStrip(dir, program, checker) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndStrip(fullPath, program, checker);
      continue;
    }
    const ext = path.extname(entry.name);
    const relFromMangledRoot = path.relative(MANGLED_FRAMEWORK_DIR, fullPath);
    const originalPath = path.join(ORIGINAL_FRAMEWORK_DIR, relFromMangledRoot);
    try {
      if (ext === '.ts') processTsFile(originalPath, fullPath, program, checker);
      else if (ext === '.html') stripHtmlComments(fullPath);
      else if (ext === '.scss' || ext === '.css') stripScssComments(fullPath);
    } catch (err) {
      console.error(`Failed to process ${fullPath}: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Verification: re-type-check the mangled output in the original project's
// context (same node_modules/tsconfig) and compare diagnostic counts against
// the untouched original, per file, to catch any rename-induced breakage.
// ---------------------------------------------------------------------------
function verify(originalProgram, options) {
  const configPath = path.join(SRC, 'tsconfig.app.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, SRC);
  const baseHost = ts.createCompilerHost(parsed.options);

  const host = {
    ...baseHost,
    readFile(fileName) {
      if (toPosix(fileName).startsWith(ORIGINAL_FRAMEWORK_DIR_POSIX)) {
        const rel = path.relative(ORIGINAL_FRAMEWORK_DIR, fileName);
        const mangledPath = path.join(MANGLED_FRAMEWORK_DIR, rel);
        if (fs.existsSync(mangledPath)) return fs.readFileSync(mangledPath, 'utf8');
      }
      return baseHost.readFile(fileName);
    },
    fileExists(fileName) {
      if (toPosix(fileName).startsWith(ORIGINAL_FRAMEWORK_DIR_POSIX)) {
        const rel = path.relative(ORIGINAL_FRAMEWORK_DIR, fileName);
        const mangledPath = path.join(MANGLED_FRAMEWORK_DIR, rel);
        if (fs.existsSync(mangledPath)) return true;
      }
      return baseHost.fileExists(fileName);
    },
  };

  const mangledProgram = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, host });

  let regressions = 0;
  let checkedCount = 0;
  for (const sourceFile of originalProgram.getSourceFiles()) {
    if (!toPosix(sourceFile.fileName).startsWith(ORIGINAL_FRAMEWORK_DIR_POSIX)) continue;
    if (sourceFile.fileName.includes('node_modules')) continue;
    checkedCount++;

    const beforeCount = ts.getPreEmitDiagnostics(originalProgram, sourceFile).length;
    const mangledSourceFile = mangledProgram.getSourceFile(sourceFile.fileName);
    const afterCount = mangledSourceFile ? ts.getPreEmitDiagnostics(mangledProgram, mangledSourceFile).length : -1;

    if (afterCount === -1) {
      console.error(`VERIFY FAIL: ${sourceFile.fileName} missing from mangled program`);
      regressions++;
    } else if (afterCount > beforeCount) {
      console.error(`VERIFY FAIL: ${sourceFile.fileName} gained ${afterCount - beforeCount} new diagnostic(s) after mangling`);
      const diags = ts.getPreEmitDiagnostics(mangledProgram, mangledSourceFile);
      diags.forEach((d) => console.error('  -', ts.flattenDiagnosticMessageText(d.messageText, '\n')));
      regressions++;
    }
  }

  console.log(`Verified ${checkedCount} file(s) under @lcp-framework.`);
  return regressions;
}

console.log(`Copying project from ${SRC} to ${DEST} (excluding node_modules, dist, .git, etc.)...`);
copyRecursive(SRC, DEST);

if (fs.existsSync(ORIGINAL_FRAMEWORK_DIR)) {
  console.log('Loading TypeScript program for symbol-safe mangling...');
  const { program, options } = loadProgram();
  const checker = program.getTypeChecker();

  console.log('Stripping comments, compacting, and mangling local vars/params under src/app/@lcp-framework...');
  walkAndStrip(MANGLED_FRAMEWORK_DIR, program, checker);

  console.log('Verifying mangled output still type-checks...');
  const regressions = verify(program, options);
  if (regressions > 0) {
    console.error(`\n${regressions} file(s) FAILED verification. Review the errors above before shipping this export.`);
    process.exitCode = 1;
  } else {
    console.log('Verification passed: no new diagnostics introduced by mangling.');
  }
} else {
  console.warn(`@lcp-framework directory not found at ${ORIGINAL_FRAMEWORK_DIR}`);
}

console.log('Done. Export written to', DEST);
