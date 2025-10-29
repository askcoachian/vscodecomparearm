# Installation and Development Guide

## For End Users

### Installing from VSIX (once published)

1. Download the `.vsix` file
2. Open VSCode
3. Go to Extensions view (Ctrl+Shift+X)
4. Click "..." menu → "Install from VSIX..."
5. Select the downloaded `.vsix` file

### Using the Extension

1. Open a workspace with ARM template JSON files
2. Right-click on an ARM template file in the Explorer
3. Select "ARM: Compare with File..."
4. Choose the second template to compare
5. View results in the Output panel and a new Markdown tab

## For Developers

### Prerequisites

- Node.js 16+ and npm
- Visual Studio Code 1.85.0 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/askcoachian/vscodecomparearm.git
cd vscodecomparearm

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

### Running Tests

```bash
# Run unit tests
npm run compile
npx mocha out/test/comparison.test.js --ui tdd
```

### Testing the Extension

1. Open the project in VSCode
2. Press F5 to launch the Extension Development Host
3. In the new VSCode window, open sample ARM templates
4. Test the comparison commands:
   - Command Palette: "ARM: Compare Selected Templates"
   - Context Menu: "ARM: Compare with File..."

### Packaging the Extension

```bash
# Install vsce (if not already installed)
npm install -g @vscode/vsce

# Package the extension
vsce package

# This creates a .vsix file that can be shared
```

### Project Structure

```
vscodecomparearm/
├── src/
│   ├── comparison.ts      # Core comparison logic
│   └── extension.ts       # VSCode extension entry point
├── test/
│   ├── comparison.test.ts # Unit tests
│   ├── fixtures/          # Sample templates for testing
│   ├── runTest.ts         # Test runner
│   └── suite/             # Test suite configuration
├── .vscode/               # VSCode configuration
│   ├── launch.json        # Debug configurations
│   ├── tasks.json         # Build tasks
│   └── settings.json      # Editor settings
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── README.md              # User documentation
```

### Making Changes

1. Edit source files in `src/`
2. Run `npm run compile` or use watch mode: `npm run watch`
3. Press F5 to test in Extension Development Host
4. Write tests in `test/` for new features
5. Ensure all tests pass before committing

### Publishing to Marketplace (maintainers only)

```bash
# Login to Azure DevOps
vsce login <publisher-name>

# Publish
vsce publish
```

## Architecture

### Comparison Algorithm

The extension uses a multi-stage comparison process:

1. **Top-level comparison**: Direct equality checks for `$schema`, `contentVersion`
2. **Resource comparison**: Order-independent matching using `name` attributes
3. **Nested object comparison**: Recursive deep comparison with type awareness
4. **Array comparison**: Smart detection of named vs. positional arrays

### Key Design Decisions

- **Name-based matching**: Resources identified by `name` attribute (or `type` as fallback)
- **Order independence**: Resources can appear in any order without affecting equality
- **Deep comparison**: Nested objects and arrays are recursively compared
- **Type safety**: Full TypeScript typing for maintainability
- **Clear output**: Multiple views (text + markdown) for different use cases

## Troubleshooting

### Compilation errors

```bash
# Clean and rebuild
rm -rf out/
npm run compile
```

### Tests not found

```bash
# Ensure tests are compiled
npm run compile
# Check test files exist
ls out/test/
```

### Extension not activating

- Check `package.json` activation events
- View Developer Console: Help → Toggle Developer Tools
- Check extension logs in Output panel
