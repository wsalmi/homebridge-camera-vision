#!/usr/bin/env python3
import os
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'interface'))
print(f'Applying Camera Vision rebranding in: {BASE_DIR}')

# 1. Update HTML
index_html_path = os.path.join(BASE_DIR, 'index.html')
with open(index_html_path, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<title>camera.ui</title>', '<title>Camera Vision</title>')
html = html.replace('content="camera.ui is a user interface for RTSP capable cameras."', 'content="Camera Vision is a modern user interface and streaming platform for RTSP and HomeKit cameras."')
html = html.replace('<meta name="apple-mobile-web-app-title" content="camera.ui">', '<meta name="apple-mobile-web-app-title" content="Camera Vision">')
html = html.replace("We're sorry but camera.ui doesn't work properly without JavaScript enabled.", "We're sorry but Camera Vision doesn't work properly without JavaScript enabled.")
html = html.replace('safari-pinned-tab.svg?v=1650815309186" color="#f1f1f1"', 'safari-pinned-tab.svg?v=1650815309186" color="#1a7f78"')

with open(index_html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print('Updated index.html')

# 2. Update Manifest
manifest_path = os.path.join(BASE_DIR, 'manifest.json')
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = f.read()

manifest = manifest.replace('"name":"camera.ui"', '"name":"Camera Vision"')
manifest = manifest.replace('"short_name":"camera.ui"', '"short_name":"Camera Vision"')
manifest = manifest.replace('"description":"camera.ui is a user interface for RTSP capable cameras."', '"description":"Camera Vision is a modern user interface for RTSP and HomeKit cameras."')

with open(manifest_path, 'w', encoding='utf-8') as f:
    f.write(manifest)
print('Updated manifest.json')

# 3. Update Service Worker
sw_path = os.path.join(BASE_DIR, 'service-worker.js')
with open(sw_path, 'r', encoding='utf-8') as f:
    sw = f.read()

sw = sw.replace("{ prefix: 'camera.ui' }", "{ prefix: 'camera-vision' }")
sw = sw.replace("tag: 'camera.ui'", "tag: 'Camera Vision'")

with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw)
print('Updated service-worker.js')

# 4. Update SVGs
svg_files = [
    'img/logo.1e20fc7f.svg',
    'img/logo_animated.f1d93d47.svg',
    'img/logo_loading_circle.7a077cad.svg'
]

svg_color_map = {
    '#730000': '#0d524d',
    '#a51733': '#146c65',
    '#f44a6b': '#38cfbf',
    '#df294c': '#1a7f78',
}

for rel_path in svg_files:
    path = os.path.join(BASE_DIR, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        svg = f.read()
    for old_c, new_c in svg_color_map.items():
        svg = svg.replace(old_c, new_c)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f'Updated {rel_path}')

# 5. Update CSS Palette
app_css_path = os.path.join(BASE_DIR, 'css/app.e43e6d5a.css')
with open(app_css_path, 'r', encoding='utf-8') as f:
    css = f.read()

css_palette_map = {
    '--cui-primary-50:#fceef2;': '--cui-primary-50:#e6f4f3;',
    '--cui-primary-50-rgb:252,238,242;': '--cui-primary-50-rgb:230,244,243;',
    '--cui-primary-100:#fadee4;': '--cui-primary-100:#cdeae7;',
    '--cui-primary-100-rgb:250,222,228;': '--cui-primary-100-rgb:205,234,231;',
    '--cui-primary-200:#f5bcc9;': '--cui-primary-200:#9bd5cf;',
    '--cui-primary-200-rgb:245,188,201;': '--cui-primary-200-rgb:155,213,207;',
    '--cui-primary-300:#ef9baf;': '--cui-primary-300:#68c0b7;',
    '--cui-primary-300-rgb:239,155,175;': '--cui-primary-300-rgb:104,192,183;',
    '--cui-primary-400:#e86986;': '--cui-primary-400:#3fab9f;',
    '--cui-primary-400-rgb:232,105,134;': '--cui-primary-400-rgb:63,171,159;',
    '--cui-primary-500:#e0375e;': '--cui-primary-500:#20968a;',
    '--cui-primary-500-rgb:224,55,94;': '--cui-primary-500-rgb:32,150,138;',
    '--cui-primary-600:#c11e44;': '--cui-primary-600:#1a7f78;',
    '--cui-primary-600-rgb:193,30,68;': '--cui-primary-600-rgb:26,127,120;',
    '--cui-primary-700:#b21c3f;': '--cui-primary-700:#146761;',
    '--cui-primary-700-rgb:178,28,63;': '--cui-primary-700-rgb:20,103,97;',
    '--cui-primary-800:#941734;': '--cui-primary-800:#0f504b;',
    '--cui-primary-800-rgb:148,23,52;': '--cui-primary-800-rgb:15,80,75;',
    '--cui-primary-900:#85152f;': '--cui-primary-900:#0a3935;',
    '--cui-primary-900-rgb:133,21,47;': '--cui-primary-900-rgb:10,57,53;',
    '--cui-primary:#d12049;': '--cui-primary:#1a7f78;',
    '--cui-primary-rgb:209,32,73;': '--cui-primary-rgb:26,127,120;'
}

for old_decl, new_decl in css_palette_map.items():
    css = css.replace(old_decl, new_decl)

with open(app_css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print('Updated app.css palette')

# 6. Update app.74c03ec3.js
app_js_path = os.path.join(BASE_DIR, 'js/app.74c03ec3.js')
with open(app_js_path, 'r', encoding='utf-8') as f:
    app_js = f.read()

app_js = app_js.replace('attrs:{href:"https://github.com/SeydX",target:"blank"}', 'attrs:{href:"https://github.com/wsalmi/homebridge-camera-vision",target:"blank"}')
app_js = app_js.replace('strong",[e._v("(c) seydx")])', 'strong",[e._v("Camera Vision")])')
app_js = app_js.replace('title:"camera.ui","aria-label":"camera.ui"', 'title:"Camera Vision","aria-label":"Camera Vision"')
app_js = app_js.replace('camera.ui', 'Camera Vision')

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(app_js)
print('Updated app.js')

# 7. Update login.26006451.js
login_js_path = os.path.join(BASE_DIR, 'js/login.26006451.js')
with open(login_js_path, 'r', encoding='utf-8') as f:
    login_js = f.read()

login_js = login_js.replace('[t._v("camera.ui")]', '[t._v("Camera Vision")]')
login_js = login_js.replace('moduleName:"camera.ui"', 'moduleName:"Camera Vision"')
login_js = login_js.replace('camera.ui', 'Camera Vision')

with open(login_js_path, 'w', encoding='utf-8') as f:
    f.write(login_js)
print('Updated login.js')

# 8. Update start.e95646d4.js
start_js_path = os.path.join(BASE_DIR, 'js/start.e95646d4.js')
with open(start_js_path, 'r', encoding='utf-8') as f:
    start_js = f.read()

start_js = start_js.replace('[t._v("camera.ui")]', '[t._v("Camera Vision")]')
start_js = start_js.replace('title:"camera.ui","aria-label":"camera.ui"', 'title:"Camera Vision","aria-label":"Camera Vision"')
start_js = start_js.replace('camera.ui', 'Camera Vision')

with open(start_js_path, 'w', encoding='utf-8') as f:
    f.write(start_js)
print('Updated start.js')

# 9. Update settings.ef8cec63.js
settings_js_path = os.path.join(BASE_DIR, 'js/settings.ef8cec63.js')
with open(settings_js_path, 'r', encoding='utf-8') as f:
    settings_js = f.read()

settings_js = settings_js.replace('"homebridge-camera-ui"===e.moduleName', '("homebridge-camera-ui"===e.moduleName||"homebridge-camera-vision"===e.moduleName)')
settings_js = settings_js.replace('"homebridge-camera-ui"===e.npmPackageName', '("homebridge-camera-ui"===e.npmPackageName||"homebridge-camera-vision"===e.npmPackageName)')
settings_js = settings_js.replace('npmPackageName:"camera.ui"', 'npmPackageName:"homebridge-camera-vision"')
settings_js = settings_js.replace('"camera.ui.log.txt"', '"camera-vision.log.txt"')
settings_js = settings_js.replace('camera.ui', 'Camera Vision')

with open(settings_js_path, 'w', encoding='utf-8') as f:
    f.write(settings_js)
print('Updated settings.js')

# 10. Update config.6bd15e18.js
config_js_path = os.path.join(BASE_DIR, 'js/config.6bd15e18.js')
with open(config_js_path, 'r', encoding='utf-8') as f:
    config_js = f.read()

config_js = config_js.replace('"homebridge-camera-ui"===i.data.env.moduleName', '("homebridge-camera-ui"===i.data.env.moduleName||"homebridge-camera-vision"===i.data.env.moduleName)')

with open(config_js_path, 'w', encoding='utf-8') as f:
    f.write(config_js)
print('Updated config.js')

# 11. Update console.81d9a384.js
console_js_path = os.path.join(BASE_DIR, 'js/console.81d9a384.js')
with open(console_js_path, 'r', encoding='utf-8') as f:
    console_js = f.read()

console_js = console_js.replace('"camera.ui.log.txt"', '"camera-vision.log.txt"')
console_js = console_js.replace('camera.ui', 'Camera Vision')

with open(console_js_path, 'w', encoding='utf-8') as f:
    f.write(console_js)
print('Updated console.js')

# 12. Update utilization.0b671abd.js
util_js_path = os.path.join(BASE_DIR, 'js/utilization.0b671abd.js')
with open(util_js_path, 'r', encoding='utf-8') as f:
    util_js = f.read()

util_js = util_js.replace('label2:"camera.ui"', 'label2:"Camera Vision"')
util_js = util_js.replace('camera.ui', 'Camera Vision')

with open(util_js_path, 'w', encoding='utf-8') as f:
    f.write(util_js)
print('Updated utilization.js')

# 13. Update dashboard.01450e2c.js
dashboard_js_path = os.path.join(BASE_DIR, 'js/dashboard.01450e2c.js')
with open(dashboard_js_path, 'r', encoding='utf-8') as f:
    dashboard_js = f.read()

dashboard_js = dashboard_js.replace('npmPackageName:"camera.ui"', 'npmPackageName:"homebridge-camera-vision"')

with open(dashboard_js_path, 'w', encoding='utf-8') as f:
    f.write(dashboard_js)
print('Updated dashboard.js')

print('Rebranding script completed successfully.')
