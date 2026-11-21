import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

setFlagsFromString('--no-incremental-marking');
const { run } = await import('./solve.js');
const inputDirectory = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(join(inputDirectory, 'cases.json'), 'utf8'));
const answers = cases.map(c => run(c.input));
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(join(outputDirectory, 'answers.json'), JSON.stringify(answers));
