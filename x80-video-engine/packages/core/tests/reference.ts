import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Behavioral reference: installed Remotion 4.0.526 (reference impl, not a runtime dep).
export const Remotion = require(
  '/kaggle/working/my-video/node_modules/remotion/dist/cjs/index.js',
) as Record<string, any>;
