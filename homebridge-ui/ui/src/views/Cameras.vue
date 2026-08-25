<template>
  <section class="camera-workspace">
    <div class="workspace-toolbar">
      <div class="filter-tabs" role="tablist" aria-label="Camera filters">
        <button :class="{ active: filter === 'all' }" type="button" @click="filter = 'all'">
          All cameras <span>{{ cameras.length }}</span>
        </button>
        <button :class="{ active: filter === 'online' }" type="button" @click="filter = 'online'">
          Online <span>{{ onlineCount }}</span>
        </button>
        <button :class="{ active: filter === 'recording' }" type="button" @click="filter = 'recording'">
          Secure Video <span>{{ hksvCount }}</span>
        </button>
      </div>
      <label class="search-box">
        <span aria-hidden="true">⌕</span>
        <input v-model.trim="search" type="search" placeholder="Search cameras" aria-label="Search cameras" />
      </label>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading camera workspace…</p>
    </div>

    <div v-else-if="filteredCameras.length" class="camera-grid">
      <article
        v-for="camera in filteredCameras"
        :key="camera.name"
        class="camera-card"
        :class="{ expanded: activeCamera === camera.name }"
      >
        <div class="camera-preview" :class="{ active: activeCamera === camera.name }">
          <canvas :ref="`canvas-${camera.name}`" width="1280" height="720"></canvas>
          <div v-if="activeCamera !== camera.name" class="preview-overlay">
            <button class="play-button" type="button" :aria-label="`Start ${camera.name}`" @click="startCamera(camera)">
              <span>▶</span>
            </button>
            <span class="preview-label">Live preview</span>
          </div>
          <div v-else class="preview-live-pill"><span></span> Live</div>
          <button
            v-if="activeCamera === camera.name"
            class="close-preview"
            type="button"
            aria-label="Stop preview"
            @click="stopCamera(camera)"
          >
            ×
          </button>
        </div>

        <div class="camera-card-body">
          <div class="camera-card-heading">
            <div>
              <h2>{{ camera.name }}</h2>
              <p class="camera-meta">
                {{ camera.model || 'RTSP camera' }}<span> · </span>{{ camera.resolution || 'Auto resolution' }}
              </p>
            </div>
            <span class="camera-health" :class="camera.status || 'ready'">
              <span></span>{{ activeCamera === camera.name ? 'Streaming' : camera.statusLabel || 'Ready' }}
            </span>
          </div>

          <div class="camera-capabilities">
            <span v-if="camera.hsv" class="capability secure"><span>◆</span> Secure Video</span>
            <span v-if="camera.motion" class="capability"><span>⌁</span> Motion</span>
            <span v-if="camera.audio" class="capability"><span>◖</span> Audio</span>
          </div>

          <div class="camera-card-footer">
            <button class="text-button" type="button" @click="toggleCamera(camera)">
              {{ activeCamera === camera.name ? 'Stop preview' : 'Open preview' }}
            </button>
            <span class="camera-index">{{ String(camera.index).padStart(2, '0') }}</span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">◌</div>
      <h2>{{ cameras.length ? 'No cameras match this view' : 'No cameras configured' }}</h2>
      <p>
        {{
          cameras.length
            ? 'Try another search or filter.'
            : 'Add an RTSP camera from Platform configuration to get started.'
        }}
      </p>
      <router-link v-if="!cameras.length" class="primary-button" to="/config">Configure a camera</router-link>
    </div>

    <div v-if="cameras.length" class="workspace-summary">
      <div class="summary-stat">
        <span class="stat-label">Connected cameras</span>
        <strong>{{ cameras.length }}</strong>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Secure Video</span>
        <strong>{{ hksvCount }} <small>enabled</small></strong>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Motion sensors</span>
        <strong>{{ motionCount }} <small>active</small></strong>
      </div>
      <div class="summary-note">
        <span class="summary-note-icon">i</span>
        HomeKit handles event notifications and recordings according to each camera’s configuration.
      </div>
    </div>
  </section>
</template>

<script>
import JSMpeg from '@seydx/jsmpeg';
import JSMpegWritableSource from '@/common/jsmpeg-source';

export default {
  name: 'Cameras',

  data() {
    return {
      activeCamera: null,
      cameras: [],
      filter: 'all',
      loading: true,
      player: null,
      search: '',
    };
  },

  computed: {
    filteredCameras() {
      return this.cameras
        .filter((camera) => {
          if (this.filter === 'online') return camera.status !== 'offline';
          if (this.filter === 'recording') return camera.hsv;
          return true;
        })
        .filter((camera) => camera.name.toLowerCase().includes(this.search.toLowerCase()));
    },

    onlineCount() {
      return this.cameras.filter((camera) => camera.status !== 'offline').length;
    },

    hksvCount() {
      return this.cameras.filter((camera) => camera.hsv).length;
    },

    motionCount() {
      return this.cameras.filter((camera) => camera.motion).length;
    },
  },

  async mounted() {
    try {
      this.cameras = (await window.homebridge.request('/cameras')).map((camera, index) => ({
        ...camera,
        index: index + 1,
        status: camera.status || 'ready',
        statusLabel: camera.statusLabel || 'Ready',
      }));
      this.$emit('camera-count', this.cameras.length);
      this.cameras.forEach((camera) => {
        window.homebridge.addEventListener(`stream/${camera.name}`, (buffer) => {
          if (this.player && this.player.name === camera.name) {
            this.player.source.write(buffer.data.data);
          }
        });
      });
    } catch (error) {
      window.homebridge.toast.error('Unable to load cameras.');
    } finally {
      this.loading = false;
    }
  },

  beforeDestroy() {
    this.stopActiveStream(false);
  },

  methods: {
    async startCamera(camera) {
      if (this.activeCamera && this.activeCamera !== camera.name) {
        this.stopActiveStream(false);
      }

      this.activeCamera = camera.name;
      this.preparePlayer(camera);
      this.setCameraStatus(camera.name, 'starting', 'Starting');

      try {
        await window.homebridge.request('/startStream', { cameraName: camera.name });
        this.setCameraStatus(camera.name, 'online', 'Streaming');
      } catch (error) {
        this.setCameraStatus(camera.name, 'offline', 'Unavailable');
        this.activeCamera = null;
        this.destroyPlayer();
        window.homebridge.toast.error(error.message || `${camera.name}: stream unavailable`);
      }
    },

    async stopCamera(camera) {
      await window.homebridge.request('/stopStream', { cameraName: camera.name });
      this.stopActiveStream(false);
      this.setCameraStatus(camera.name, 'ready', 'Ready');
    },

    async toggleCamera(camera) {
      if (this.activeCamera === camera.name) {
        await this.stopCamera(camera);
      } else {
        await this.startCamera(camera);
      }
    },

    setCameraStatus(cameraName, status, statusLabel) {
      const target = this.cameras.find((item) => item.name === cameraName);
      if (!target) return;
      target.status = status;
      target.statusLabel = statusLabel;
    },

    preparePlayer(camera) {
      this.destroyPlayer();
      const canvas = this.$refs[`canvas-${camera.name}`]?.[0];
      if (!canvas) return;

      this.player = new JSMpeg.Player(null, {
        source: JSMpegWritableSource,
        canvas,
        audio: false,
        disableWebAssembly: true,
        pauseWhenHidden: false,
        videoBufferSize: 1024 * 1024,
        onSourceEstablished: () => {
          this.setCameraStatus(camera.name, 'online', 'Streaming');
        },
      });
      this.player.volume = 0;
      this.player.name = camera.name;
    },

    destroyPlayer() {
      if (this.player) {
        this.player.destroy?.();
        this.player = null;
      }
    },

    stopActiveStream(notify = true) {
      if (this.activeCamera) {
        window.homebridge.request('/stopStream', { cameraName: this.activeCamera });
        if (notify) window.homebridge.toast.info('Preview stopped.');
      }
      this.activeCamera = null;
      this.destroyPlayer();
    },
  },
};
</script>

<style scoped>
.camera-workspace {
  min-width: 0;
}

.workspace-toolbar {
  align-items: center;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin-bottom: 22px;
}

.filter-tabs {
  display: flex;
  gap: 5px;
}

.filter-tabs button {
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--vision-muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 11px;
}

.filter-tabs button:hover,
.filter-tabs button.active {
  background: var(--vision-surface);
  box-shadow: 0 2px 10px rgba(25, 42, 53, 0.05);
  color: var(--vision-text);
}

.filter-tabs span {
  color: var(--vision-subtle);
  font-size: 10px;
  margin-left: 5px;
}

.search-box {
  align-items: center;
  background: var(--vision-surface);
  border: 1px solid var(--vision-border);
  border-radius: 8px;
  color: var(--vision-muted);
  display: flex;
  gap: 8px;
  padding: 7px 11px;
  width: 190px;
}

.search-box input {
  background: transparent;
  border: 0;
  color: var(--vision-text);
  font: inherit;
  font-size: 12px;
  min-width: 0;
  outline: 0;
  width: 100%;
}

.search-box input::placeholder {
  color: var(--vision-subtle);
}

.camera-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
}

.camera-card {
  background: var(--vision-surface);
  border: 1px solid var(--vision-border);
  border-radius: 14px;
  box-shadow: var(--vision-shadow);
  overflow: hidden;
  transition: border-color 180ms ease, transform 180ms ease;
}

.camera-card:hover {
  border-color: color-mix(in srgb, var(--vision-accent) 45%, var(--vision-border));
  transform: translateY(-2px);
}

.camera-card.expanded {
  border-color: var(--vision-accent);
  grid-column: span 2;
}

.camera-preview {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #1b2a31, #0b1014);
  overflow: hidden;
  position: relative;
}

.camera-preview canvas {
  display: block;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 220ms ease;
  width: 100%;
}

.camera-preview.active canvas {
  opacity: 1;
}

.preview-overlay {
  align-items: center;
  background: linear-gradient(180deg, rgba(14, 25, 31, 0.06), rgba(14, 25, 31, 0.72));
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.play-button {
  align-items: center;
  background: var(--vision-accent);
  border: 0;
  border-radius: 50%;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
  color: white;
  cursor: pointer;
  display: flex;
  font-size: 15px;
  height: 48px;
  justify-content: center;
  padding-left: 3px;
  transition: transform 160ms ease, background 160ms ease;
  width: 48px;
}

.play-button:hover {
  background: var(--vision-accent-strong);
  transform: scale(1.06);
}

.preview-label {
  color: rgba(255, 255, 255, 0.75);
  font-size: 10px;
  font-weight: 700;
  margin-top: 12px;
  text-transform: uppercase;
}

.preview-live-pill {
  align-items: center;
  background: rgba(10, 17, 21, 0.66);
  border-radius: 99px;
  color: #ffffff;
  display: flex;
  font-size: 10px;
  font-weight: 800;
  gap: 6px;
  left: 12px;
  padding: 6px 9px;
  position: absolute;
  text-transform: uppercase;
  top: 12px;
}

.preview-live-pill span,
.camera-health span {
  background: #8bd35d;
  border-radius: 50%;
  height: 6px;
  width: 6px;
}

.close-preview {
  background: rgba(10, 17, 21, 0.66);
  border: 0;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  font-size: 20px;
  height: 28px;
  line-height: 1;
  position: absolute;
  right: 12px;
  top: 12px;
  width: 28px;
}

.camera-card-body {
  padding: 16px 17px 14px;
}

.camera-card-heading,
.camera-card-footer,
.camera-health,
.camera-capabilities,
.workspace-summary,
.summary-note {
  align-items: center;
  display: flex;
}

.camera-card-heading,
.camera-card-footer {
  justify-content: space-between;
}

.camera-card-heading h2 {
  font-size: 15px;
  letter-spacing: -0.02em;
  margin: 0;
}

.camera-meta {
  font-size: 11px;
  margin: 5px 0 0;
}

.camera-health {
  color: var(--vision-muted);
  font-size: 10px;
  gap: 5px;
}

.camera-health.starting span {
  background: #d7a84b;
}

.camera-health.offline span {
  background: #cf6c63;
}

.camera-health.ready span {
  background: var(--vision-subtle);
}

.camera-capabilities {
  border-bottom: 1px solid var(--vision-border);
  gap: 7px;
  margin-top: 16px;
  padding-bottom: 14px;
}

.capability {
  background: var(--vision-surface-soft);
  border-radius: 5px;
  color: var(--vision-muted);
  font-size: 9px;
  font-weight: 800;
  padding: 5px 7px;
  text-transform: uppercase;
}

.capability span {
  color: var(--vision-accent);
  margin-right: 3px;
}

.capability.secure {
  background: var(--vision-accent-soft);
  color: var(--vision-accent-strong);
}

.camera-card-footer {
  padding-top: 12px;
}

.text-button,
.primary-button {
  background: transparent;
  border: 0;
  color: var(--vision-accent-strong);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  padding: 0;
  text-decoration: none;
}

.camera-index {
  color: var(--vision-subtle);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.workspace-summary {
  border-top: 1px solid var(--vision-border);
  gap: 34px;
  margin-top: 40px;
  padding-top: 22px;
}

.summary-stat {
  min-width: 100px;
}

.stat-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.summary-stat strong {
  font-size: 22px;
  letter-spacing: -0.04em;
}

.summary-stat small {
  color: var(--vision-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
}

.summary-note {
  border-left: 1px solid var(--vision-border);
  color: var(--vision-muted);
  font-size: 11px;
  gap: 8px;
  line-height: 1.45;
  margin-left: auto;
  max-width: 340px;
  padding-left: 22px;
}

.summary-note-icon {
  align-items: center;
  border: 1px solid var(--vision-border);
  border-radius: 50%;
  display: flex;
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 800;
  height: 19px;
  justify-content: center;
  width: 19px;
}

.loading-state,
.empty-state {
  align-items: center;
  background: var(--vision-surface);
  border: 1px dashed var(--vision-border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.loading-state p,
.empty-state p {
  font-size: 13px;
}

.loading-spinner {
  animation: spin 850ms linear infinite;
  border: 2px solid var(--vision-border);
  border-radius: 50%;
  border-top-color: var(--vision-accent);
  height: 24px;
  width: 24px;
}

.empty-icon {
  color: var(--vision-accent);
  font-size: 36px;
}

.empty-state h2 {
  font-size: 18px;
  margin: 12px 0 0;
}

.empty-state p {
  margin: 8px 0 20px;
}

.primary-button {
  background: var(--vision-accent);
  border-radius: 8px;
  color: #ffffff;
  padding: 10px 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .camera-card.expanded {
    grid-column: span 1;
  }

  .workspace-summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .summary-note {
    border-left: 0;
    margin-left: 0;
    max-width: none;
    padding-left: 0;
    width: 100%;
  }
}

@media (max-width: 600px) {
  .workspace-toolbar {
    align-items: stretch;
    flex-direction: column-reverse;
    gap: 12px;
  }

  .filter-tabs {
    justify-content: space-between;
  }

  .filter-tabs button {
    padding: 8px 5px;
  }

  .search-box {
    width: 100%;
  }

  .workspace-summary {
    gap: 18px;
  }
}
</style>
