/**
 * Camera Vision 0.1
 *
 * @url https://github.com/wsalmi/homebridge-camera-vision
 * @author wsalmi
 *
 **/
'use-strict';

import { HomebridgeCameraVision } from './src/platform.js';

export default (api) => {
  api.registerPlatform('homebridge-camera-vision', 'CameraVision', HomebridgeCameraVision);
};
