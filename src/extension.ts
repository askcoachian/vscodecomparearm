import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { compareARMTemplates, ARMTemplate, ComparisonResult } from './comparison';

let outputChannel: vscode.OutputChannel;

/**
 * Normalize ARM template for better visual diffing
 * Sorts resources by name and standardizes formatting
 */
function normalizeARMTemplate(template: ARMTemplate): string {
    const normalized = { ...template };
    
    // Sort resources by name for consistent ordering
    if (normalized.resources) {
        normalized.resources = [...normalized.resources].sort((a, b) => {
            const nameA = a.name || a.type || '';
            const nameB = b.name || b.type || '';
            return nameA.localeCompare(nameB);
        });
    }
    
    // Sort parameters, variables, outputs by key
    if (normalized.parameters) {
        const sortedParams: Record<string, any> = {};
        Object.keys(normalized.parameters).sort().forEach(key => {
            sortedParams[key] = normalized.parameters![key];
        });
        normalized.parameters = sortedParams;
    }
    
    if (normalized.variables) {
        const sortedVars: Record<string, any> = {};
        Object.keys(normalized.variables).sort().forEach(key => {
            sortedVars[key] = normalized.variables![key];
        });
        normalized.variables = sortedVars;
    }
    
    if (normalized.outputs) {
        const sortedOutputs: Record<string, any> = {};
        Object.keys(normalized.outputs).sort().forEach(key => {
            sortedOutputs[key] = normalized.outputs![key];
        });
        normalized.outputs = sortedOutputs;
    }
    
    // Return formatted JSON with consistent indentation
    return JSON.stringify(normalized, null, 2);
}

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
    
    // Command: Visual diff view with ARM normalization
    const visualDiffCommand = vscode.commands.registerCommand(
        'armCompare.visualDiff',
        async (uri?: vscode.Uri) => {
            let leftUri: vscode.Uri;
            
            if (uri) {
                leftUri = uri;
            } else {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor found');
                    return;
                }
                leftUri = editor.document.uri;
            }
            
            // Ask user to select second file
            const files = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'JSON Files': ['json'] },
                title: 'Select Previous Version'
            });
            
            if (!files || files.length === 0) {
                return;
            }
            
            // Swap parameters: files[0] is the previous (left), leftUri is the current (right)
            await createVisualDiff(files[0], leftUri);
        }
    );
    
    context.subscriptions.push(compareSelectedCommand);
    context.subscriptions.push(visualDiffCommand);
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

async function createVisualDiff(leftUri: vscode.Uri, rightUri: vscode.Uri) {
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
        
        // Normalize templates for better diffing
        const normalizedLeft = normalizeARMTemplate(leftTemplate);
        const normalizedRight = normalizeARMTemplate(rightTemplate);
        
        // Create normalized files on disk
        // Left side = previous version (read-only)
        const leftNormalizedUri = vscode.Uri.file(path.join(
            path.dirname(leftUri.fsPath), 
            `${path.basename(leftUri.fsPath, '.json')} normalized.json`
        ));
        // Right side = current version (editable)
        const rightNormalizedUri = vscode.Uri.file(path.join(
            path.dirname(rightUri.fsPath), 
            `${path.basename(rightUri.fsPath, '.json')} normalized.json`
        ));
        
        // Write normalized content to files
        await fs.promises.writeFile(leftNormalizedUri.fsPath, normalizedLeft, 'utf-8');
        await fs.promises.writeFile(rightNormalizedUri.fsPath, normalizedRight, 'utf-8');
        
        // Make the left (previous) file read-only using Windows attrib command
        try {
            if (process.platform === 'win32') {
                const { exec } = require('child_process');
                exec(`attrib +R "${leftNormalizedUri.fsPath}"`, (error: any) => {
                    if (error) {
                        console.log('Could not set Windows read-only attribute:', error);
                    }
                });
            } else {
                // Unix-like systems
                await fs.promises.chmod(leftNormalizedUri.fsPath, 0o444);
            }
        } catch (error) {
            console.log('Could not set file permissions:', error);
        }
        
        // Open in VS Code's built-in diff editor
        const title = `ARM Diff: ${path.basename(leftUri.fsPath)} (Previous) ↔ ${path.basename(rightUri.fsPath)} (Current)`;
        await vscode.commands.executeCommand('vscode.diff', 
            leftNormalizedUri, 
            rightNormalizedUri, 
            title
        );
        
        // Set up document listener to enforce read-only on the left file
        const disposable = vscode.workspace.onDidOpenTextDocument(async (document) => {
            if (document.uri.fsPath === leftNormalizedUri.fsPath) {
                // Mark the document as read-only in VS Code
                await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
                
                // Also show a message to clarify
                vscode.window.showInformationMessage(
                    `📖 This is the previous version (read-only). Edit the current version on the right side.`,
                    { modal: false }
                );
            }
        });
        
        // Optional: Add a status bar message to inform user about the normalized files
        vscode.window.setStatusBarMessage(
            `📝 ARM Diff: Left (previous) is read-only, right (current) is editable. Changes saved to normalized file.`, 
            10000
        );
        
        // Clean up the listener after some time
        setTimeout(() => {
            disposable.dispose();
        }, 300000); // 5 minutes
        
        // Also show the semantic comparison in output
        const result = compareARMTemplates(leftTemplate, rightTemplate);
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine('ARM TEMPLATE VISUAL DIFF OPENED');
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine('');
        outputChannel.appendLine(`Left:  ${path.basename(leftUri.fsPath)}`);
        outputChannel.appendLine(`Right: ${path.basename(rightUri.fsPath)}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('📋 Semantic Analysis:');
        outputChannel.appendLine(result.summary);
        outputChannel.appendLine('');
        outputChannel.appendLine('👀 Visual diff shows ARM templates with:');
        outputChannel.appendLine('  • Resources sorted by name for easy comparison');
        outputChannel.appendLine('  • Parameters, variables, outputs alphabetized');
        outputChannel.appendLine('  • Consistent JSON formatting');
        outputChannel.appendLine('');
        if (!result.isEqual) {
            outputChannel.appendLine(`🔍 Found ${result.differences.length} semantic differences:`);
            result.differences.forEach((diff, i) => {
                outputChannel.appendLine(`  ${i+1}. ${diff.path} (${diff.type}): ${diff.description}`);
            });
        } else {
            outputChannel.appendLine('✅ Templates are semantically identical');
        }
        
        // Clean up temporary files after a delay
        setTimeout(async () => {
            try {
                await fs.promises.unlink(leftNormalizedUri.fsPath);
                await fs.promises.unlink(rightNormalizedUri.fsPath);
            } catch (error) {
                // Ignore cleanup errors
            }
        }, 300000); // Clean up after 5 minutes
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating visual diff: ${error}`);
    }
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
