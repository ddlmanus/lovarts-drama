const fs = require('fs')
const path = require('path')
const helpers = [
  path.join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds', 'darwin-arm64', 'spawn-helper'),
  path.join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds', 'darwin-x64', 'spawn-helper'),
]
for (const helper of helpers) {
  if (!fs.existsSync(helper)) continue
  try {
    fs.chmodSync(helper, 0o755)
    console.log('node-pty spawn-helper executable:', helper)
  } catch (err) {
    console.warn('failed to chmod node-pty spawn-helper:', helper, err.message)
  }
}
