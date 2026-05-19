
const fs = require('fs');

const content = fs.readFileSync('xfa_raw_template.xml', 'utf8');

// Find 'sTitular' and look backwards for parent subforms
// This is a naive check but might work for simple nesting
const stitularIndex = content.indexOf('name="sTitular"');
if (stitularIndex === -1) {
    console.log('sTitular not found');
} else {
    // Look at the preceding 5000 chars to find open tags
    const context = content.substring(Math.max(0, stitularIndex - 5000), stitularIndex);
    // basic regex to find subform names
    const regex = /<subform\s+[^>]*name="([^"]+)"/g;
    let match;
    const parents = [];
    while ((match = regex.exec(context)) !== null) {
        parents.push(match[1]);
    }
    console.log('Potential parents found before sTitular:');
    console.log(parents.join(' -> '));

    // Check if `principal` is in there
    if (parents.includes('principal')) {
        console.log('Found "principal" in parents list!');
    }
}
