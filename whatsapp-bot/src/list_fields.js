const fs = require('fs');
const content = fs.readFileSync('xfa_raw_template.xml', 'utf8');

const subforms = [];
const fields = [];

const subformRegex = /<subform\s+[^>]*name="([^"]+)"/g;
let match;
while ((match = subformRegex.exec(content)) !== null) {
    subforms.push(match[1]);
}

const fieldRegex = /<field\s+[^>]*name="([^"]+)"/g;
while ((match = fieldRegex.exec(content)) !== null) {
    fields.push(match[1]);
}

console.log('--- SUBFORMS ---');
console.log(subforms.join('\n'));
console.log('\n--- FIELDS ---');
console.log(fields.join('\n'));
