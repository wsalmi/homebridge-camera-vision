import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

import readline from 'readline';
import childProcess from 'child_process';
import fs from 'fs-extra';

import * as cameraUtils from 'camera.ui/src/controller/camera/utils/camera.utils.js';
import { defaultVideoProcess } from 'camera.ui/src/services/config/config.defaults.js';

const streams = new Map();
const PLUGIN_ALIASES = new Set(['CameraVision', 'CameraUI']);

class UiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    this.onRequest('/interfaceConfig', this.getInterfaceConfig.bind(this));
    this.onRequest('/status', this.getStatus.bind(this));
    this.onRequest('/cameras', this.getCameras.bind(this));
    this.onRequest('/startStream', this.startStream.bind(this));
    this.onRequest('/stopStream', this.stopStream.bind(this));
    this.onRequest('/stopStreams', this.stopStreams.bind(this));

    this.ready();
  }

  async readPlatformConfig() {
    const config = (await fs.readJSON(this.homebridgeConfigPath, { throws: false })) || {};
    return config.platforms?.find((plugin) => plugin && PLUGIN_ALIASES.has(plugin.platform));
  }

  async getInterfaceConfig() {
    const platformConfig = await this.readPlatformConfig();

    if (!platformConfig) return false;

    const isHttps = Boolean(platformConfig.ssl?.active && platformConfig.ssl.key && platformConfig.ssl.cert);
    return {
      protocol: isHttps ? 'https' : 'http',
      port: platformConfig.port || 8081,
    };
  }

  async getStatus() {
    const platformConfig = await this.readPlatformConfig();
    const cameras = platformConfig?.cameras?.filter((camera) => camera && !camera.disable) || [];

    return {
      cameraCount: cameras.filter((camera) => camera.videoConfig?.source).length,
      hksvEnabled: cameras.some((camera) => camera.hsv),
      activeStreams: [...streams.values()].filter((stream) => stream.process && !stream.process.killed).length,
    };
  }

  async getCameras() {
    const platformConfig = await this.readPlatformConfig();
    const configuredCameras = platformConfig?.cameras?.filter(
      (camera) => camera && !camera.disable && camera.name && camera.videoConfig?.source
    ) || [];
    const videoProcessor = platformConfig?.options?.videoProcessor || defaultVideoProcess;
    const cameras = [];

    for (const camera of configuredCameras) {
      const videoConfig = cameraUtils.generateVideoConfig(camera.videoConfig);
      const probe = await this.probe(camera.name, videoProcessor, camera.videoConfig.source);
      let source = cameraUtils.generateInputSource(videoConfig);
      source = cameraUtils.checkDeprecatedFFmpegArguments(probe.ffmpegVersion, source);

      streams.set(camera.name, {
        cameraName: camera.name,
        source: Array.isArray(source) ? source.join(' ') : source,
        ffmpegPath: videoProcessor,
        ffmpegOptions: {
          '-s': `${videoConfig.maxWidth || 1280}x${videoConfig.maxHeight || 720}`,
          '-b:v': `${videoConfig.maxBitrate || 299}k`,
          '-r': videoConfig.maxFPS >= 20 ? videoConfig.maxFPS : 20,
          '-bf': 0,
          '-preset:v': 'ultrafast',
          '-threads': '1',
        },
        process: null,
      });

      cameras.push({
        name: camera.name,
        model: camera.model || 'RTSP camera',
        resolution: videoConfig.maxWidth && videoConfig.maxHeight ? `${videoConfig.maxWidth}×${videoConfig.maxHeight}` : 'Adaptive',
        hsv: Boolean(camera.hsv),
        motion: camera.motion !== false,
        audio: Boolean(videoConfig.audio),
        status: 'ready',
        statusLabel: 'Ready',
      });
    }

    return cameras;
  }

  normalizeCameraName(payload) {
    if (typeof payload === 'string') return payload;
    return payload?.cameraName || payload?.name;
  }

  async resolveStream(cameraName) {
    let stream = streams.get(cameraName);
    if (!stream) {
      await this.getCameras();
      stream = streams.get(cameraName);
    }
    return stream;
  }

  startStream(payload) {
    const cameraName = this.normalizeCameraName(payload);

    return new Promise(async (resolve, reject) => {
      if (!cameraName) {
        reject(new RequestError('A camera name is required.'));
        return;
      }

      const camera = await this.resolveStream(cameraName);
      if (!camera) {
        reject(new RequestError(`Camera "${cameraName}" not found.`));
        return;
      }

      if (camera.process && !camera.process.killed) {
        resolve({ started: true, cameraName });
        return;
      }

      const additionalFlags = Object.entries(camera.ffmpegOptions || {}).flatMap(([key, value]) => [key, String(value)]);
      const args = [
        '-hide_banner',
        '-loglevel',
        'error',
        ...camera.source.split(/\s+/),
        '-f',
        'mpegts',
        '-vcodec',
        'mpeg1video',
        ...additionalFlags,
        '-an',
        '-q',
        '1',
        '-max_muxing_queue_size',
        '9999',
        '-',
      ];

      console.log(`${cameraName}: Starting UI preview with ${camera.ffmpegPath} ${args.join(' ')}`);
      camera.process = childProcess.spawn(camera.ffmpegPath, args, { env: process.env });
      let started = false;
      let settled = false;
      const errors = [];

      const settleStart = (error) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve({ started: true, cameraName });
      };

      camera.process.stdout.on('data', (data) => {
        if (!started) {
          started = true;
          settleStart();
        }
        this.pushEvent(`stream/${cameraName}`, data);
      });

      camera.process.stderr.on('data', (data) => errors.push(data.toString()));
      camera.process.on('error', (error) => settleStart(new RequestError(`${cameraName}: ${error.message}`)));
      camera.process.on('exit', (code, signal) => {
        const wasStopped = signal === 'SIGTERM' || signal === 'SIGKILL' || camera.process?.killed;
        camera.process = null;
        if (!started && code !== 0 && !wasStopped) {
          settleStart(new RequestError(`${cameraName}: ${errors.join(' ').trim() || 'RTSP stream exited with an error.'}`));
        }
      });
    });
  }

  stopStream(payload) {
    const cameraName = this.normalizeCameraName(payload);
    if (!cameraName) return { stopped: false };

    const camera = streams.get(cameraName);
    if (!camera) throw new RequestError(`Camera "${cameraName}" not found.`);

    if (camera.process && !camera.process.killed) {
      camera.process.kill('SIGTERM');
      camera.process = null;
    }

    return { stopped: true, cameraName };
  }

  stopStreams() {
    for (const cameraName of streams.keys()) this.stopStream(cameraName);
    return { stopped: true };
  }

  probe(cameraName, videoProcessor, source) {
    return new Promise((resolve) => {
      let lines = 0;
      const codecs = {
        ffmpegVersion: null,
        timedout: false,
        audio: [],
        video: [],
        bitrate: '? kb/s',
        mapvideo: '',
        mapaudio: '',
      };
      const args = ['-analyzeduration', '0', '-probesize', '5000', ...source.split(/\s+/)];
      let childProc;
      try {
        childProc = childProcess.spawn(videoProcessor, args, { env: process.env });
      } catch (err) {
        console.error(`${cameraName}: Failed to spawn probe process:`, err);
        return resolve(codecs);
      }

      const stderr = readline.createInterface({ input: childProc.stderr, terminal: false });
      const timeout = setTimeout(() => {
        codecs.timedout = true;
        try {
          childProc.kill('SIGKILL');
        } catch (_) {}
      }, 10000);

      stderr.on('line', (line) => {
        if (lines === 0) codecs.ffmpegVersion = line.split(' ')[2] || null;
        if (line.includes('start: ') && line.includes('bitrate: ')) codecs.bitrate = line.split('bitrate: ')[1];
        if (line.includes('Audio: ')) {
          codecs.audio = line.split('Audio: ')[1].split(', ');
          codecs.mapaudio = line.split('Stream #')[1]?.split(': Audio')[0] || '';
        }
        if (line.includes('Video: ')) {
          codecs.video = line.split('Video: ')[1].split(', ');
          codecs.mapvideo = line.split('Stream #')[1]?.split(': Video')[0] || '';
        }
        lines += 1;
      });

      childProc.on('exit', () => {
        clearTimeout(timeout);
        stderr.close();
        console.log(`${cameraName}: ${JSON.stringify(codecs)}`);
        resolve(codecs);
      });
      childProc.on('error', (err) => {
        clearTimeout(timeout);
        console.error(`${cameraName}: probe process error:`, err);
        resolve(codecs);
      });
    });
  }
}

(() => new UiServer())();
