<template>
  <div class="vision-app">
    <header class="topbar">
      <div class="brand-lockup">
        <img class="brand-logo-img" src="@/assets/img/logo.png" alt="Camera Vision" width="38" height="38" />
        <div>
          <div class="brand-name">Camera Vision</div>
          <div class="brand-caption">Material camera platform</div>
        </div>
      </div>

      <div class="topbar-actions">
        <div class="system-status">
          <span class="status-dot" :class="{ online: systemOnline }"></span>
          <span>{{ systemLabel }}</span>
        </div>
        <a v-if="interfaceLink" class="interface-link" :href="interfaceLink" target="_blank" rel="noreferrer">
          Open Homebridge
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>

    <div class="app-shell">
      <aside class="vision-sidebar">
        <div class="sidebar-section-label">Workspace</div>
        <nav class="primary-nav" aria-label="Primary navigation">
          <router-link class="nav-item" to="/cameras">
            <span class="nav-icon" aria-hidden="true">◉</span>
            <span>Cameras</span>
            <span v-if="cameraCount" class="nav-count">{{ cameraCount }}</span>
          </router-link>
          <router-link class="nav-item" to="/config">
            <span class="nav-icon" aria-hidden="true">⌘</span>
            <span>Configuration</span>
          </router-link>
        </nav>

        <div class="sidebar-divider"></div>
        <div class="sidebar-section-label">Platform</div>
        <div class="platform-card">
          <span class="platform-icon">⌂</span>
          <div>
            <strong>Apple HomeKit</strong>
            <span>{{ hksvLabel }}</span>
          </div>
        </div>

        <div class="sidebar-footer">
          <span>Camera Vision v0.1</span>
          <a href="https://github.com/wsalmi/homebridge-camera-vision" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </aside>

      <main class="main-content">
        <div class="page-heading">
          <div>
            <div class="eyebrow">HOMEKIT CAMERA PLATFORM</div>
            <h1>{{ pageTitle }}</h1>
            <p>{{ pageDescription }}</p>
          </div>
          <div class="heading-badge">
            <span class="badge-dot"></span>
            {{ cameraCount ? `${cameraCount} connected` : 'Ready to connect' }}
          </div>
        </div>

        <router-view @camera-count="cameraCount = $event" />
      </main>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',

  data() {
    return {
      cameraCount: 0,
      interfaceLink: null,
      systemOnline: false,
      hksvEnabled: false,
    };
  },

  computed: {
    pageTitle() {
      return this.$route.path === '/config' ? 'Platform configuration' : 'Camera workspace';
    },

    pageDescription() {
      return this.$route.path === '/config'
        ? 'Tune streams, recording, motion events and the HomeKit bridge from one place.'
        : 'Monitor live feeds and keep your HomeKit camera setup in view.';
    },

    systemLabel() {
      return this.systemOnline ? 'Homebridge connected' : 'Connecting to Homebridge';
    },

    hksvLabel() {
      return this.hksvEnabled ? 'Secure Video enabled' : 'Secure Video available';
    },
  },

  async mounted() {
    window.homebridge.showSpinner();

    const applyTheme = () => {
      const isDark =
        window.document.body.classList.contains('dark-mode') ||
        window.document.body.classList.contains('config-ui-x-dark-mode') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    };

    const loadPlatformData = async () => {
      if (this.systemOnline) return;
      applyTheme();
      try {
        const [interfaceConfig, status] = await Promise.all([
          window.homebridge.request('/interfaceConfig'),
          window.homebridge.request('/status'),
        ]);

        if (interfaceConfig) {
          const { protocol, port } = interfaceConfig;
          this.interfaceLink = `${protocol}://${window.location.hostname}:${port}`;
        }

        this.cameraCount = status?.cameraCount || 0;
        this.hksvEnabled = Boolean(status?.hksvEnabled);
        this.systemOnline = true;
      } catch (_) {
        // Platform status load handled quietly
      } finally {
        window.homebridge.hideSpinner();
      }
    };

    window.homebridge.addEventListener('ready', () => {
      loadPlatformData();
    });

    // Run immediately if ready event already occurred
    loadPlatformData();
  },
};
</script>

<style>
:root {
  --vision-bg: #f4f6f8;
  --vision-surface: #ffffff;
  --vision-surface-soft: #f8fafb;
  --vision-border: #e4e9ee;
  --vision-text: #17212b;
  --vision-muted: #6d7c88;
  --vision-subtle: #9aa7b2;
  --vision-accent: #1a7f78;
  --vision-accent-soft: #e4f4f1;
  --vision-accent-strong: #0f5f5a;
  --vision-shadow: 0 18px 50px rgba(32, 54, 68, 0.08);
}

[data-theme='dark'] {
  --vision-bg: #11171c;
  --vision-surface: #192228;
  --vision-surface-soft: #202c33;
  --vision-border: #2c3a43;
  --vision-text: #f1f6f8;
  --vision-muted: #a8b7bf;
  --vision-subtle: #778891;
  --vision-accent: #55c7bb;
  --vision-accent-soft: #183e3d;
  --vision-accent-strong: #8de2d9;
  --vision-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: auto;
  min-height: 0;
  margin: 0;
}

body {
  background: var(--vision-bg);
  color: var(--vision-text);
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
}

.vision-app {
  min-height: 520px;
  background: var(--vision-bg);
  color: var(--vision-text);
}

.topbar {
  align-items: center;
  background: var(--vision-surface);
  border-bottom: 1px solid var(--vision-border);
  display: flex;
  justify-content: space-between;
  min-height: 76px;
  padding: 0 38px;
}

.brand-lockup,
.topbar-actions,
.system-status,
.interface-link,
.platform-card,
.sidebar-footer,
.heading-badge {
  align-items: center;
  display: flex;
}

.brand-lockup {
  gap: 12px;
}

.brand-logo-img {
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 104, 95, 0.2);
  object-fit: cover;
}

.brand-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.brand-caption,
.sidebar-section-label,
.eyebrow,
.sidebar-footer,
.platform-card span,
.page-heading p,
.camera-meta,
.empty-state p,
.config-note,
.stat-label {
  color: var(--vision-muted);
}

.brand-caption {
  font-size: 11px;
  margin-top: 2px;
}

.topbar-actions {
  gap: 24px;
}

.system-status {
  color: var(--vision-muted);
  font-size: 12px;
  gap: 8px;
}

.status-dot,
.badge-dot {
  background: var(--vision-subtle);
  border-radius: 50%;
  display: inline-block;
  height: 7px;
  width: 7px;
}

.status-dot.online,
.badge-dot {
  background: var(--vision-accent);
  box-shadow: 0 0 0 4px var(--vision-accent-soft);
}

.interface-link {
  color: var(--vision-accent-strong);
  font-size: 12px;
  font-weight: 700;
  gap: 6px;
  text-decoration: none;
}

.app-shell {
  display: grid;
  grid-template-columns: 228px minmax(0, 1fr);
  min-height: 480px;
}

.vision-sidebar {
  background: var(--vision-surface) !important;
  border-right: 1px solid var(--vision-border);
  display: flex;
  flex-direction: column;
  padding: 34px 20px 22px;
}

.sidebar-section-label,
.eyebrow {
  color: var(--vision-muted) !important;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.sidebar-section-label {
  padding: 0 13px;
}

.primary-nav {
  display: grid;
  gap: 5px;
  margin-top: 12px;
}

.nav-item {
  align-items: center;
  border-radius: 10px;
  color: var(--vision-muted) !important;
  display: flex;
  font-size: 13px;
  font-weight: 700;
  gap: 10px;
  padding: 12px 13px;
  text-decoration: none;
  transition: background 160ms ease, color 160ms ease;
}

.nav-item:hover,
.nav-item.router-link-exact-active {
  background: var(--vision-accent-soft) !important;
  color: var(--vision-accent-strong) !important;
}

.nav-icon {
  font-size: 16px;
  line-height: 1;
  width: 18px;
}

.nav-count {
  background: var(--vision-surface);
  border: 1px solid var(--vision-border);
  border-radius: 99px;
  font-size: 10px;
  margin-left: auto;
  padding: 2px 7px;
}

.sidebar-divider {
  border-top: 1px solid var(--vision-border);
  margin: 30px 12px 24px;
}

.platform-card {
  background: var(--vision-surface-soft) !important;
  border: 1px solid var(--vision-border);
  border-radius: 12px;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
}

.platform-icon {
  align-items: center;
  background: var(--vision-accent-soft);
  border-radius: 8px;
  color: var(--vision-accent-strong) !important;
  display: flex;
  font-size: 16px;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.platform-card strong,
.platform-card span {
  display: block;
}

.platform-card strong {
  color: var(--vision-text) !important;
  font-size: 11px;
}

.platform-card span:not(.platform-icon) {
  color: var(--vision-muted) !important;
  font-size: 10px;
  margin-top: 3px;
}

.sidebar-footer {
  align-items: flex-start;
  flex-direction: column;
  font-size: 10px;
  gap: 6px;
  line-height: 1.4;
  margin-top: auto;
  padding: 0 13px;
}

.sidebar-footer a {
  color: var(--vision-accent-strong);
  font-weight: 700;
  text-decoration: none;
}

.main-content {
  margin: 0 auto;
  max-width: 1320px;
  padding: 50px 6vw 64px;
  width: 100%;
}

.page-heading {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  margin-bottom: 34px;
}

.page-heading h1 {
  font-size: clamp(28px, 3vw, 40px);
  letter-spacing: -0.04em;
  line-height: 1;
  margin: 10px 0 11px;
}

.page-heading p {
  font-size: 14px;
  margin: 0;
  max-width: 540px;
}

.heading-badge {
  background: var(--vision-accent-soft);
  border-radius: 99px;
  color: var(--vision-accent-strong);
  font-size: 11px;
  font-weight: 800;
  gap: 9px;
  padding: 9px 14px;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .topbar {
    min-height: 68px;
    padding: 0 18px;
  }

  .brand-caption,
  .interface-link {
    display: none;
  }

  .app-shell {
    display: block;
  }

  .vision-sidebar {
    background: var(--vision-surface) !important;
    border-bottom: 1px solid var(--vision-border);
    border-right: 0;
    padding: 14px 18px;
  }

  .sidebar-section-label,
  .sidebar-divider,
  .platform-card,
  .sidebar-footer {
    display: none;
  }

  .primary-nav {
    display: flex;
    gap: 6px;
    margin-top: 0;
  }

  .nav-item {
    flex: 1;
    justify-content: center;
    padding: 10px;
  }

  .nav-count {
    margin-left: 0;
  }

  .main-content {
    padding: 34px 18px 48px;
  }

  .page-heading {
    display: block;
  }

  .heading-badge {
    display: inline-flex;
    margin-top: 18px;
  }
}
</style>
