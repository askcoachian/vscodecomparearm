#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { compareARMTemplates } = require('./out/src/comparison');

// Read the fixture files
const template1Path = path.join(__dirname, 'test/fixtures/template1.json');
const template2Path = path.join(__dirname, 'test/fixtures/template2.json');

const template1 = JSON.parse(fs.readFileSync(template1Path, 'utf-8'));
const template2 = JSON.parse(fs.readFileSync(template2Path, 'utf-8'));

console.log('Comparing ARM Templates:');
console.log('Template 1:', template1Path);
console.log('Template 2:', template2Path);
console.log('');

const result = compareARMTemplates(template1, template2);

console.log('Summary:', result.summary);
console.log('');

if (result.isEqual) {
    console.log('✓ Templates are identical');
} else {
    console.log('Differences found:');
    console.log('');
    
    result.differences.forEach((diff, index) => {
        console.log(`${index + 1}. ${diff.description}`);
        console.log(`   Path: ${diff.path}`);
        console.log(`   Type: ${diff.type}`);
        if (diff.leftValue !== undefined) {
            console.log(`   Left:  ${JSON.stringify(diff.leftValue)}`);
        }
        if (diff.rightValue !== undefined) {
            console.log(`   Right: ${JSON.stringify(diff.rightValue)}`);
        }
        console.log('');
    });
}
