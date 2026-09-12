<template>
  <section class="config-workspace">
    <div class="config-hero">
      <div>
        <div class="eyebrow">CONTROL PLANE</div>
        <h2>Configure once. Monitor everywhere.</h2>
        <p>
          Camera Vision uses the Homebridge configuration schema so your stream, Apple HomeKit Secure Video and motion
          settings stay in one portable place.
        </p>
      </div>
      <button class="primary-button" type="button" @click="openSchema">Open configuration</button>
    </div>

    <div class="config-grid">
      <article class="config-card">
        <div class="config-card-icon">◉</div>
        <div>
          <h3>Live streams</h3>
          <p>Connect RTSP sources with native or transcoded H.264 profiles, adaptive sizing and optional audio.</p>
          <span class="config-tag">FFmpeg ready</span>
        </div>
      </article>
      <article class="config-card">
        <div class="config-card-icon secure">◆</div>
        <div>
          <h3>Secure Video</h3>
          <p>
            Expose the modern CameraController path so HomeKit can request motion-triggered fragmented MP4 recordings.
          </p>
          <span class="config-tag">HomeKit compatible</span>
        </div>
      </article>
      <article class="config-card">
        <div class="config-card-icon motion">⌁</div>
        <div>
          <h3>Motion events</h3>
          <p>Use video analysis or external HTTP, MQTT, SMTP and FTP signals to drive the HomeKit motion sensor.</p>
          <span class="config-tag">Event driven</span>
        </div>
      </article>
    </div>

    <div class="config-guide">
      <div class="guide-number">01</div>
      <div>
        <h3>Start with a camera source</h3>
        <p>
          Open the native form below and add the camera name plus an FFmpeg source such as
          <code>-i rtsp://camera-address/stream</code>.
        </p>
      </div>
      <div class="guide-number">02</div>
      <div>
        <h3>Enable the HomeKit features you need</h3>
        <p>Turn on HSV for recording, motion for detection, and prebuffering when you need shorter response time.</p>
      </div>
    </div>

    <div class="schema-panel">
      <div>
        <div class="eyebrow">HOMEBRIDGE SCHEMA</div>
        <h3>Platform configuration</h3>
        <p class="config-note">
          The form is provided by Homebridge and remains compatible with existing Camera UI configuration blocks.
        </p>
      </div>
      <button class="secondary-button" type="button" @click="openSchema">
        Edit settings <span aria-hidden="true">↗</span>
      </button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'Config',

  mounted() {
    this.openSchema();
  },

  beforeDestroy() {
    window.homebridge.hideSchemaForm?.();
  },

  methods: {
    openSchema() {
      if (!window.homebridge || !window.homebridge.showSchemaForm) return;
      window.homebridge.showSchemaForm();
    },
  },
};
</script>

<style scoped>
.config-workspace {
  display: grid;
  gap: 22px;
}

.config-hero,
.config-card,
.config-guide,
.schema-panel {
  background: var(--vision-surface);
  border: 1px solid var(--vision-border);
  border-radius: 14px;
}

.config-hero {
  align-items: center;
  display: flex;
  gap: 32px;
  justify-content: space-between;
  padding: 28px;
}

.config-hero h2 {
  font-size: 21px;
  letter-spacing: -0.03em;
  margin: 9px 0;
}

.config-hero p,
.config-card p,
.config-guide p,
.config-note {
  color: var(--vision-muted);
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
}

.config-hero p {
  max-width: 610px;
}

.eyebrow {
  color: var(--vision-accent-strong);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.primary-button,
.secondary-button {
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  flex: 0 0 auto;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  padding: 11px 15px;
}

.primary-button {
  background: var(--vision-accent);
  color: #ffffff;
}

.secondary-button {
  background: var(--vision-accent-soft);
  color: var(--vision-accent-strong);
}

.config-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.config-card {
  display: flex;
  gap: 15px;
  padding: 20px;
}

.config-card-icon {
  align-items: center;
  background: #e8eff7;
  border-radius: 10px;
  color: #4e7395;
  display: flex;
  flex: 0 0 auto;
  font-size: 20px;
  height: 39px;
  justify-content: center;
  width: 39px;
}

.config-card-icon.secure {
  background: var(--vision-accent-soft);
  color: var(--vision-accent-strong);
}

.config-card-icon.motion {
  background: #f7efe3;
  color: #b47a3d;
}

.config-card h3,
.config-guide h3,
.schema-panel h3 {
  font-size: 13px;
  margin: 1px 0 7px;
}

.config-tag {
  color: var(--vision-accent-strong);
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  margin-top: 13px;
  text-transform: uppercase;
}

.config-guide {
  align-items: start;
  display: grid;
  gap: 14px 18px;
  grid-template-columns: 30px minmax(0, 1fr) 30px minmax(0, 1fr);
  padding: 21px 25px;
}

.guide-number {
  align-items: center;
  background: var(--vision-accent-soft);
  border-radius: 50%;
  color: var(--vision-accent-strong);
  display: flex;
  font-size: 9px;
  font-weight: 900;
  height: 27px;
  justify-content: center;
  width: 27px;
}

.schema-panel {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 22px 25px;
}

.schema-panel h3 {
  margin: 8px 0 4px;
}

code {
  background: var(--vision-surface-soft);
  border: 1px solid var(--vision-border);
  border-radius: 4px;
  font-size: 10px;
  padding: 2px 4px;
}

@media (max-width: 900px) {
  .config-grid {
    grid-template-columns: 1fr;
  }

  .config-guide {
    grid-template-columns: 30px minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .config-hero,
  .schema-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .config-hero {
    padding: 22px;
  }
}
</style>
