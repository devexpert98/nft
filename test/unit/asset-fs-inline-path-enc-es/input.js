import fs from 'node:fs';
import * as path from 'node:path';

console.log(fs.readFileSync(path.join(__dirname, 'asset.txt'), 'utf8'));