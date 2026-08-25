import assert from 'node:assert/strict';
import test from 'node:test';

import registerPlugin from '../index.js';
import Config from '../services/config/config.service.js';

test('registers CameraVision using the Homebridge v2 platform signature', () => {
  const calls = [];
  const api = {
    registerPlatform: (...arguments_) => calls.push(arguments_),
  };

  registerPlugin(api);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), ['homebridge-camera-vision', 'CameraVision']);
  assert.equal(typeof calls[0][2], 'function');
  assert.equal(calls[0].length, 3);
});

test('normalizes camera motion and prebuffer values without dropping zero', () => {
  const config = new Config({
    cameras: [
      {
        name: 'Test camera',
        motionTimeout: 0,
        motionDelay: 0,
        prebufferLength: 6,
        videoConfig: {
          source: '-i rtsp://127.0.0.1/stream',
        },
      },
    ],
  });

  assert.equal(config.cameras.length, 1);
  assert.equal(config.cameras[0].motionTimeout, 0);
  assert.equal(config.cameras[0].motionDelay, 0);
  assert.equal(config.cameras[0].prebufferLength, 6);
  assert.equal(config.cameras[0].videoConfig.stillImageSource, '-i rtsp://127.0.0.1/stream');
  assert.equal(config.cameras[0].videoConfig.subSource, '-i rtsp://127.0.0.1/stream');
});

test('rejects invalid camera source definitions', () => {
  const config = new Config({
    cameras: [
      {
        name: 'Invalid camera',
        videoConfig: {
          source: 'rtsp://127.0.0.1/stream',
        },
      },
    ],
  });

  assert.equal(config.cameras.length, 0);
});

test('creates CameraController services for HomeKit Secure Video on HAP-NodeJS 2', async () => {
  const {
    AudioRecordingCodecType,
    AudioRecordingSamplerate,
    AudioStreamingCodecType,
    AudioStreamingSamplerate,
    CameraController,
    EventTriggerOption,
    H264Level,
    H264Profile,
    MediaContainerType,
    SRTPCryptoSuites,
    VideoCodecType,
  } = await import('@homebridge/hap-nodejs');

  const recordingDelegate = {
    acknowledgeStream() {},
    closeRecordingStream() {},
    handleRecordingStreamRequest: async function* handleRecordingStreamRequest() {},
    updateRecordingActive() {},
    updateRecordingConfiguration() {},
  };
  const streamingDelegate = {
    handleSnapshotRequest() {},
    handleStreamRequest() {},
    prepareStream() {},
  };
  const controller = new CameraController({
    cameraStreamCount: 1,
    delegate: streamingDelegate,
    streamingOptions: {
      supportedCryptoSuites: [SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80],
      video: {
        resolutions: [[1280, 720, 30]],
        codec: {
          profiles: [H264Profile.BASELINE],
          levels: [H264Level.LEVEL3_1],
        },
      },
      audio: {
        twoWayAudio: false,
        codecs: [
          {
            type: AudioStreamingCodecType.AAC_ELD,
            samplerate: AudioStreamingSamplerate.KHZ_16,
          },
        ],
      },
    },
    recording: {
      delegate: recordingDelegate,
      options: {
        prebufferLength: 4000,
        overrideEventTriggerOptions: [EventTriggerOption.MOTION],
        mediaContainerConfiguration: [{ type: MediaContainerType.FRAGMENTED_MP4, fragmentLength: 4000 }],
        video: {
          type: VideoCodecType.H264,
          parameters: {
            profiles: [H264Profile.BASELINE],
            levels: [H264Level.LEVEL3_1],
          },
          resolutions: [[1280, 720, 30]],
        },
        audio: {
          codecs: [
            {
              type: AudioRecordingCodecType.AAC_LC,
              bitrateMode: 0,
              samplerate: [AudioRecordingSamplerate.KHZ_16],
              audioChannels: 1,
            },
          ],
        },
      },
    },
    sensors: { motion: true },
  });

  const services = controller.constructServices();

  assert.ok(controller.recordingManagement);
  assert.ok(controller.motionService);
  assert.ok(services.cameraEventRecordingManagement);
  assert.ok(services.dataStreamTransportManagement);
});
