# ARM Template Comparator

A Visual Studio Code extension for comparing Azure Resource Manager (ARM) Templates with intelligent, object-by-object comparison.

## Features

- **Object-by-Object Comparison**: Compares ARM template resources by their `name` attribute, not just line-by-line
- **Order-Independent**: Resources can be reordered in the template without affecting equality
- **Detailed Diff View**: Shows exactly what changed between templates
- **Structured Output**: Groups differences by type (added, removed, modified)

## Why This Extension?

ARM templates are JSON files where the order of resources doesn't matter, and resources are identified by their `name` attribute. Traditional diff tools show line-by-line changes, making it difficult to understand semantic differences when:
- Resources are reordered
- Properties are added or removed within a resource
- Multiple changes occur across different resources

This extension provides a semantic comparison that understands ARM template structure.

## Usage

### Method 1: Command Palette

1. Open an ARM template JSON file
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
3. Type "ARM: Compare Selected Templates" and select the command
4. Choose the second ARM template file to compare

### Method 2: Context Menu

1. Right-click on an ARM template JSON file in the Explorer
2. Select "ARM: Compare with File..."
3. Choose the second ARM template file to compare

### Viewing Results

The comparison results are shown in two ways:
1. **Output Channel**: Detailed text output in the "ARM Template Compare" output channel
2. **Markdown Document**: A formatted view opened in a new editor tab showing:
   - Summary of differences
   - Added resources/properties
   - Removed resources/properties
   - Modified resources/properties

## Comparison Logic

The extension uses the following comparison strategy:

1. **Top-level properties**: Direct comparison of `$schema`, `contentVersion`
2. **Resources**: Order-independent comparison using the `name` attribute as the unique identifier
3. **Parameters, Variables, Outputs**: Object-by-object comparison
4. **Nested arrays**: Smart comparison that detects if arrays contain named objects

## Example

Given two templates where resources are simply reordered:

**Template 1:**
```json
{
  "resources": [
    { "type": "Microsoft.Storage/storageAccounts", "name": "storage1" },
    { "type": "Microsoft.Network/virtualNetworks", "name": "vnet1" }
  ]
}
```

**Template 2:**
```json
{
  "resources": [
    { "type": "Microsoft.Network/virtualNetworks", "name": "vnet1" },
    { "type": "Microsoft.Storage/storageAccounts", "name": "storage1" }
  ]
}
```

This extension will report: **"Templates are identical"** ✓

A traditional diff tool would show many lines changed.

## Development

### Building

```bash
npm install
npm run compile
```

### Running Tests

```bash
npm run compile
npx mocha out/test/comparison.test.js --ui tdd
```

### Testing in VSCode

1. Open this project in VSCode
2. Press F5 to launch an Extension Development Host
3. Open or create ARM template JSON files
4. Use the comparison commands to test

## Requirements

- Visual Studio Code 1.85.0 or higher

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

