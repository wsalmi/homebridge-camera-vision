'use-strict';

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localInterface = path.resolve(__dirname, '../interface');

const candidatePaths = [
  path.resolve(__dirname, '../node_modules/camera.ui/interface'),
  path.resolve(__dirname, '../../camera.ui/interface'),
  path.resolve('/var/lib/homebridge/node_modules/camera.ui/interface'),
  path.resolve('/var/lib/homebridge/node_modules/homebridge-camera-vision/node_modules/camera.ui/interface'),
  path.resolve('/usr/local/lib/node_modules/camera.ui/interface'),
  path.resolve('/usr/local/lib/node_modules/homebridge-camera-vision/node_modules/camera.ui/interface'),
];

if (fs.existsSync(localInterface)) {
  for (const target of candidatePaths) {
    if (fs.existsSync(path.dirname(target))) {
      try {
        fs.copySync(localInterface, target, { overwrite: true });
      } catch {
        // ignore permission or missing path errors
      }
    }
  }
}
