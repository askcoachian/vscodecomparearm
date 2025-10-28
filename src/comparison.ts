/**
 * ARM Template Comparison Logic
 * Compares ARM templates object-by-object, using "name" attribute as identifier
 * Order-independent comparison for arrays of objects
 */

export interface ARMTemplate {
    $schema?: string;
    contentVersion?: string;
    parameters?: Record<string, any>;
    variables?: Record<string, any>;
    resources?: any[];
    outputs?: Record<string, any>;
    [key: string]: any;
}

export interface ComparisonResult {
    isEqual: boolean;
    differences: Difference[];
    summary: string;
}

export interface Difference {
    path: string;
    type: 'added' | 'removed' | 'modified' | 'reordered';
    leftValue?: any;
    rightValue?: any;
    description: string;
}

/**
 * Compare two ARM templates
 */
export function compareARMTemplates(left: ARMTemplate, right: ARMTemplate): ComparisonResult {
    const differences: Difference[] = [];
    
    // Compare top-level properties
    compareTopLevel(left, right, differences);
    
    // Compare resources (order-independent, name-based)
    if (left.resources || right.resources) {
        compareResources(left.resources || [], right.resources || [], differences);
    }
    
    // Compare parameters
    if (left.parameters || right.parameters) {
        compareObjects(left.parameters || {}, right.parameters || {}, 'parameters', differences);
    }
    
    // Compare variables
    if (left.variables || right.variables) {
        compareObjects(left.variables || {}, right.variables || {}, 'variables', differences);
    }
    
    // Compare outputs
    if (left.outputs || right.outputs) {
        compareObjects(left.outputs || {}, right.outputs || {}, 'outputs', differences);
    }
    
    const isEqual = differences.length === 0;
    const summary = generateSummary(differences);
    
    return { isEqual, differences, summary };
}

/**
 * Compare top-level properties like $schema and contentVersion
 */
function compareTopLevel(left: ARMTemplate, right: ARMTemplate, differences: Difference[]): void {
    const topLevelProps = ['$schema', 'contentVersion'];
    
    for (const prop of topLevelProps) {
        if (left[prop] !== right[prop]) {
            differences.push({
                path: prop,
                type: 'modified',
                leftValue: left[prop],
                rightValue: right[prop],
                description: `${prop} differs: "${left[prop]}" vs "${right[prop]}"`
            });
        }
    }
}

/**
 * Compare resources arrays (order-independent, using "name" as identifier)
 */
function compareResources(leftResources: any[], rightResources: any[], differences: Difference[]): void {
    // Create maps indexed by resource name
    const leftMap = new Map<string, any>();
    const rightMap = new Map<string, any>();
    
    // Index left resources
    for (const resource of leftResources) {
        const name = resource.name || resource.type || `unnamed_${leftResources.indexOf(resource)}`;
        leftMap.set(name, resource);
    }
    
    // Index right resources
    for (const resource of rightResources) {
        const name = resource.name || resource.type || `unnamed_${rightResources.indexOf(resource)}`;
        rightMap.set(name, resource);
    }
    
    // Find resources only in left (removed in right)
    for (const [name, resource] of leftMap) {
        if (!rightMap.has(name)) {
            differences.push({
                path: `resources[name="${name}"]`,
                type: 'removed',
                leftValue: resource,
                description: `Resource "${name}" was removed`
            });
        }
    }
    
    // Find resources only in right (added)
    for (const [name, resource] of rightMap) {
        if (!leftMap.has(name)) {
            differences.push({
                path: `resources[name="${name}"]`,
                type: 'added',
                rightValue: resource,
                description: `Resource "${name}" was added`
            });
        }
    }
    
    // Compare resources that exist in both
    for (const [name, leftResource] of leftMap) {
        if (rightMap.has(name)) {
            const rightResource = rightMap.get(name);
            compareResourceObject(leftResource, rightResource, `resources[name="${name}"]`, differences);
        }
    }
}

/**
 * Compare individual resource objects
 */
function compareResourceObject(left: any, right: any, path: string, differences: Difference[]): void {
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
    
    for (const key of allKeys) {
        const leftValue = left[key];
        const rightValue = right[key];
        const currentPath = `${path}.${key}`;
        
        if (!(key in left)) {
            differences.push({
                path: currentPath,
                type: 'added',
                rightValue: rightValue,
                description: `Property "${key}" was added`
            });
        } else if (!(key in right)) {
            differences.push({
                path: currentPath,
                type: 'removed',
                leftValue: leftValue,
                description: `Property "${key}" was removed`
            });
        } else if (!deepEqual(leftValue, rightValue)) {
            // For nested objects or arrays, recursively compare
            if (typeof leftValue === 'object' && typeof rightValue === 'object' && leftValue !== null && rightValue !== null) {
                if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                    // Compare arrays (could be order-independent if they contain objects with names)
                    compareArrays(leftValue, rightValue, currentPath, differences);
                } else if (!Array.isArray(leftValue) && !Array.isArray(rightValue)) {
                    compareObjects(leftValue, rightValue, currentPath, differences);
                } else {
                    differences.push({
                        path: currentPath,
                        type: 'modified',
                        leftValue: leftValue,
                        rightValue: rightValue,
                        description: `Type changed from ${Array.isArray(leftValue) ? 'array' : 'object'} to ${Array.isArray(rightValue) ? 'array' : 'object'}`
                    });
                }
            } else {
                differences.push({
                    path: currentPath,
                    type: 'modified',
                    leftValue: leftValue,
                    rightValue: rightValue,
                    description: `Value changed from "${JSON.stringify(leftValue)}" to "${JSON.stringify(rightValue)}"`
                });
            }
        }
    }
}

/**
 * Compare two objects recursively
 */
function compareObjects(left: Record<string, any>, right: Record<string, any>, path: string, differences: Difference[]): void {
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
    
    for (const key of allKeys) {
        const leftValue = left[key];
        const rightValue = right[key];
        const currentPath = `${path}.${key}`;
        
        if (!(key in left)) {
            differences.push({
                path: currentPath,
                type: 'added',
                rightValue: rightValue,
                description: `Property "${key}" was added`
            });
        } else if (!(key in right)) {
            differences.push({
                path: currentPath,
                type: 'removed',
                leftValue: leftValue,
                description: `Property "${key}" was removed`
            });
        } else if (!deepEqual(leftValue, rightValue)) {
            if (typeof leftValue === 'object' && typeof rightValue === 'object' && leftValue !== null && rightValue !== null) {
                if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                    compareArrays(leftValue, rightValue, currentPath, differences);
                } else if (!Array.isArray(leftValue) && !Array.isArray(rightValue)) {
                    compareObjects(leftValue, rightValue, currentPath, differences);
                } else {
                    differences.push({
                        path: currentPath,
                        type: 'modified',
                        leftValue: leftValue,
                        rightValue: rightValue,
                        description: `Type changed`
                    });
                }
            } else {
                differences.push({
                    path: currentPath,
                    type: 'modified',
                    leftValue: leftValue,
                    rightValue: rightValue,
                    description: `Value changed`
                });
            }
        }
    }
}

/**
 * Compare arrays (order-independent if they contain objects with names)
 */
function compareArrays(left: any[], right: any[], path: string, differences: Difference[]): void {
    // Check if arrays contain objects with "name" property
    const hasNamedObjects = left.some(item => typeof item === 'object' && item !== null && 'name' in item) ||
                           right.some(item => typeof item === 'object' && item !== null && 'name' in item);
    
    if (hasNamedObjects) {
        // Order-independent comparison
        const leftMap = new Map<string, any>();
        const rightMap = new Map<string, any>();
        
        for (let i = 0; i < left.length; i++) {
            const item = left[i];
            const name = (typeof item === 'object' && item !== null && item.name) ? item.name : `index_${i}`;
            leftMap.set(name, item);
        }
        
        for (let i = 0; i < right.length; i++) {
            const item = right[i];
            const name = (typeof item === 'object' && item !== null && item.name) ? item.name : `index_${i}`;
            rightMap.set(name, item);
        }
        
        // Find items only in left
        for (const [name, item] of leftMap) {
            if (!rightMap.has(name)) {
                differences.push({
                    path: `${path}[name="${name}"]`,
                    type: 'removed',
                    leftValue: item,
                    description: `Array item "${name}" was removed`
                });
            }
        }
        
        // Find items only in right
        for (const [name, item] of rightMap) {
            if (!leftMap.has(name)) {
                differences.push({
                    path: `${path}[name="${name}"]`,
                    type: 'added',
                    rightValue: item,
                    description: `Array item "${name}" was added`
                });
            }
        }
        
        // Compare items in both
        for (const [name, leftItem] of leftMap) {
            if (rightMap.has(name)) {
                const rightItem = rightMap.get(name);
                if (!deepEqual(leftItem, rightItem)) {
                    if (typeof leftItem === 'object' && typeof rightItem === 'object' && leftItem !== null && rightItem !== null) {
                        compareObjects(leftItem, rightItem, `${path}[name="${name}"]`, differences);
                    } else {
                        differences.push({
                            path: `${path}[name="${name}"]`,
                            type: 'modified',
                            leftValue: leftItem,
                            rightValue: rightItem,
                            description: `Array item "${name}" was modified`
                        });
                    }
                }
            }
        }
    } else {
        // Order-dependent comparison for simple arrays
        if (left.length !== right.length) {
            differences.push({
                path: path,
                type: 'modified',
                leftValue: left,
                rightValue: right,
                description: `Array length changed from ${left.length} to ${right.length}`
            });
        } else {
            for (let i = 0; i < left.length; i++) {
                if (!deepEqual(left[i], right[i])) {
                    differences.push({
                        path: `${path}[${i}]`,
                        type: 'modified',
                        leftValue: left[i],
                        rightValue: right[i],
                        description: `Array item at index ${i} was modified`
                    });
                }
            }
        }
    }
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (typeof a !== typeof b) return false;
    
    if (a === null || b === null) return a === b;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    
    if (Array.isArray(a) || Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
}

/**
 * Generate a summary of differences
 */
function generateSummary(differences: Difference[]): string {
    if (differences.length === 0) {
        return 'Templates are identical';
    }
    
    const added = differences.filter(d => d.type === 'added').length;
    const removed = differences.filter(d => d.type === 'removed').length;
    const modified = differences.filter(d => d.type === 'modified').length;
    
    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (removed > 0) parts.push(`${removed} removed`);
    if (modified > 0) parts.push(`${modified} modified`);
    
    return `Found ${differences.length} differences: ${parts.join(', ')}`;
}
