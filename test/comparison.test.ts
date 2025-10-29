import * as assert from 'assert';
import { compareARMTemplates, ARMTemplate } from '../src/comparison';

suite('ARM Template Comparison Tests', () => {
    
    test('Identical templates should be equal', () => {
        const template1: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        
        const template2: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        
        const result = compareARMTemplates(template1, template2);
        assert.strictEqual(result.isEqual, true);
        assert.strictEqual(result.differences.length, 0);
    });
    
    test('Different schema should be detected', () => {
        const template1: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        
        const template2: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        
        const result = compareARMTemplates(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.path === '$schema'));
    });
    
    test('Order-independent resource comparison', () => {
        const template1: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01"
                },
                {
                    "type": "Microsoft.Network/virtualNetworks",
                    "name": "vnet1",
                    "apiVersion": "2021-02-01"
                }
            ]
        };
        
        const template2: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Network/virtualNetworks",
                    "name": "vnet1",
                    "apiVersion": "2021-02-01"
                },
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01"
                }
            ]
        };
        
        const result = compareARMTemplates(template1, template2);
        assert.strictEqual(result.isEqual, true, 'Templates should be equal despite different resource order');
        assert.strictEqual(result.differences.length, 0);
    });
    
    test('Added resource should be detected', () => {
        const template1: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01"
                }
            ]
        };
        
        const template2: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01"
                },
                {
                    "type": "Microsoft.Network/virtualNetworks",
                    "name": "vnet1",
                    "apiVersion": "2021-02-01"
                }
            ]
        };
        
        const result = compareARMTemplates(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'added' && d.path.includes('vnet1')));
    });
    
    test('Removed resource should be detected', () => {
        const template1: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01"
                },
                {
                    "type": "Microsoft.Network/virtualNetworks",
                    "name": "vnet1",
                    "apiVersion": "2021-02-01"
                }
            ]
        };
        
        const template2: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01"
                }
            ]
        };
        
        const result = compareARMTemplates(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'removed' && d.path.includes('vnet1')));
    });
    
    test('Modified resource property should be detected', () => {
        const template1: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01",
                    "sku": {
                        "name": "Standard_LRS"
                    }
                }
            ]
        };
        
        const template2: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "storage1",
                    "apiVersion": "2021-04-01",
                    "sku": {
                        "name": "Standard_GRS"
                    }
                }
            ]
        };
        
        const result = compareARMTemplates(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'modified'));
    });
    
    test('Parameters comparison', () => {
        const template1: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {
                "param1": {
                    "type": "string"
                }
            },
            "resources": []
        };
        
        const template2: ARMTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {
                "param1": {
                    "type": "string"
                },
                "param2": {
                    "type": "int"
                }
            },
            "resources": []
        };
        
        const result = compareARMTemplates(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'added' && d.path.includes('param2')));
    });
});
