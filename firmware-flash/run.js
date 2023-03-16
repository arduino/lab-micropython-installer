import { run } from './index.js';

const result = await run();
process.exit(result ? 0 : -1);