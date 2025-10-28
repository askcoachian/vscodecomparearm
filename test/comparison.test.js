"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const comparison_1 = require("../src/comparison");
suite('ARM Template Comparison Tests', () => {
    test('Identical templates should be equal', () => {
        const template1 = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        const template2 = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        const result = (0, comparison_1.compareARMTemplates)(template1, template2);
        assert.strictEqual(result.isEqual, true);
        assert.strictEqual(result.differences.length, 0);
    });
    test('Different schema should be detected', () => {
        const template1 = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        const template2 = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": []
        };
        const result = (0, comparison_1.compareARMTemplates)(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.path === '$schema'));
    });
    test('Order-independent resource comparison', () => {
        const template1 = {
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
        const template2 = {
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
        const result = (0, comparison_1.compareARMTemplates)(template1, template2);
        assert.strictEqual(result.isEqual, true, 'Templates should be equal despite different resource order');
        assert.strictEqual(result.differences.length, 0);
    });
    test('Added resource should be detected', () => {
        const template1 = {
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
        const template2 = {
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
        const result = (0, comparison_1.compareARMTemplates)(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'added' && d.path.includes('vnet1')));
    });
    test('Removed resource should be detected', () => {
        const template1 = {
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
        const template2 = {
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
        const result = (0, comparison_1.compareARMTemplates)(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'removed' && d.path.includes('vnet1')));
    });
    test('Modified resource property should be detected', () => {
        const template1 = {
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
        const template2 = {
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
        const result = (0, comparison_1.compareARMTemplates)(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'modified'));
    });
    test('Parameters comparison', () => {
        const template1 = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {
                "param1": {
                    "type": "string"
                }
            },
            "resources": []
        };
        const template2 = {
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
        const result = (0, comparison_1.compareARMTemplates)(template1, template2);
        assert.strictEqual(result.isEqual, false);
        assert.ok(result.differences.some(d => d.type === 'added' && d.path.includes('param2')));
    });
});
//# sourceMappingURL=comparison.test.js.map