import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { compareARMTemplates, ARMTemplate, ComparisonResult } from './comparison';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('ARM Template Compare');
    
    // Command: Compare two selected files
    const compareSelectedCommand = vscode.commands.registerCommand(
        'armCompare.compareSelected',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            
            // Get the current file
            const currentFile = editor.document.uri;
            
            // Ask user to select second file
            const files = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'JSON Files': ['json'] },
                title: 'Select ARM Template to Compare With'
            });
            
            if (!files || files.length === 0) {
                return;
            }
            
            await compareFiles(currentFile, files[0]);
        }
    );
    
    // Command: Compare with file from context menu
    const compareWithFileCommand = vscode.commands.registerCommand(
        'armCompare.compareWithFile',
        async (uri: vscode.Uri) => {
            // Ask user to select second file
            const files = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'JSON Files': ['json'] },
                title: 'Select ARM Template to Compare With'
            });
            
            if (!files || files.length === 0) {
                return;
            }
            
            await compareFiles(uri, files[0]);
        }
    );
    
    context.subscriptions.push(compareSelectedCommand);
    context.subscriptions.push(compareWithFileCommand);
    context.subscriptions.push(outputChannel);
}

async function compareFiles(leftUri: vscode.Uri, rightUri: vscode.Uri) {
    try {
        // Read both files
        const leftContent = await fs.promises.readFile(leftUri.fsPath, 'utf-8');
        const rightContent = await fs.promises.readFile(rightUri.fsPath, 'utf-8');
        
        // Parse JSON
        let leftTemplate: ARMTemplate;
        let rightTemplate: ARMTemplate;
        
        try {
            leftTemplate = JSON.parse(leftContent);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to parse ${path.basename(leftUri.fsPath)}: ${error}`);
            return;
        }
        
        try {
            rightTemplate = JSON.parse(rightContent);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to parse ${path.basename(rightUri.fsPath)}: ${error}`);
            return;
        }
        
        // Compare templates
        const result = compareARMTemplates(leftTemplate, rightTemplate);
        
        // Display results
        await displayComparisonResults(leftUri, rightUri, result);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error comparing files: ${error}`);
    }
}

async function displayComparisonResults(
    leftUri: vscode.Uri,
    rightUri: vscode.Uri,
    result: ComparisonResult
) {
    const leftName = path.basename(leftUri.fsPath);
    const rightName = path.basename(rightUri.fsPath);
    
    // Clear and show output channel
    outputChannel.clear();
    outputChannel.show();
    
    // Write header
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('ARM TEMPLATE COMPARISON RESULTS');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('');
    outputChannel.appendLine(`Left:  ${leftName}`);
    outputChannel.appendLine(`Right: ${rightName}`);
    outputChannel.appendLine('');
    outputChannel.appendLine(result.summary);
    outputChannel.appendLine('');
    
    if (result.isEqual) {
        outputChannel.appendLine('✓ Templates are identical');
        vscode.window.showInformationMessage('ARM Templates are identical');
        return;
    }
    
    // Write differences
    outputChannel.appendLine('DIFFERENCES:');
    outputChannel.appendLine('-'.repeat(80));
    
    for (const diff of result.differences) {
        outputChannel.appendLine('');
        outputChannel.appendLine(`Path: ${diff.path}`);
        outputChannel.appendLine(`Type: ${diff.type.toUpperCase()}`);
        outputChannel.appendLine(`Description: ${diff.description}`);
        
        if (diff.leftValue !== undefined) {
            outputChannel.appendLine(`Left Value:  ${JSON.stringify(diff.leftValue, null, 2)}`);
        }
        
        if (diff.rightValue !== undefined) {
            outputChannel.appendLine(`Right Value: ${JSON.stringify(diff.rightValue, null, 2)}`);
        }
        
        outputChannel.appendLine('-'.repeat(80));
    }
    
    // Show summary message
    vscode.window.showInformationMessage(
        `Found ${result.differences.length} differences. Check Output panel for details.`,
        'Show Output'
    ).then(selection => {
        if (selection === 'Show Output') {
            outputChannel.show();
        }
    });
    
    // Create a virtual document with the comparison
    const comparisonDoc = await createComparisonDocument(leftName, rightName, result);
    const doc = await vscode.workspace.openTextDocument({
        content: comparisonDoc,
        language: 'markdown'
    });
    
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}

async function createComparisonDocument(
    leftName: string,
    rightName: string,
    result: ComparisonResult
): Promise<string> {
    let doc = `# ARM Template Comparison\n\n`;
    doc += `## Files\n`;
    doc += `- **Left**: ${leftName}\n`;
    doc += `- **Right**: ${rightName}\n\n`;
    doc += `## Summary\n`;
    doc += `${result.summary}\n\n`;
    
    if (result.isEqual) {
        doc += `✓ **Templates are identical**\n`;
        return doc;
    }
    
    doc += `## Differences (${result.differences.length})\n\n`;
    
    // Group by type
    const added = result.differences.filter(d => d.type === 'added');
    const removed = result.differences.filter(d => d.type === 'removed');
    const modified = result.differences.filter(d => d.type === 'modified');
    
    if (added.length > 0) {
        doc += `### Added (${added.length})\n`;
        for (const diff of added) {
            doc += `- **${diff.path}**: ${diff.description}\n`;
            if (diff.rightValue !== undefined) {
                doc += `  \`\`\`json\n  ${JSON.stringify(diff.rightValue, null, 2)}\n  \`\`\`\n`;
            }
        }
        doc += '\n';
    }
    
    if (removed.length > 0) {
        doc += `### Removed (${removed.length})\n`;
        for (const diff of removed) {
            doc += `- **${diff.path}**: ${diff.description}\n`;
            if (diff.leftValue !== undefined) {
                doc += `  \`\`\`json\n  ${JSON.stringify(diff.leftValue, null, 2)}\n  \`\`\`\n`;
            }
        }
        doc += '\n';
    }
    
    if (modified.length > 0) {
        doc += `### Modified (${modified.length})\n`;
        for (const diff of modified) {
            doc += `- **${diff.path}**: ${diff.description}\n`;
            if (diff.leftValue !== undefined || diff.rightValue !== undefined) {
                doc += `  - Left:  \`${JSON.stringify(diff.leftValue)}\`\n`;
                doc += `  - Right: \`${JSON.stringify(diff.rightValue)}\`\n`;
            }
        }
        doc += '\n';
    }
    
    return doc;
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
