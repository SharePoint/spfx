const nodeTrustedToolProfile = require('@rushstack/heft-node-rig/profiles/default/includes/eslint/flat/profile/node-trusted-tool');
const friendlyLocalsMixin = require('@rushstack/heft-node-rig/profiles/default/includes/eslint/flat/mixins/friendly-locals')

module.exports = [
  ...friendlyLocalsMixin,
  ...nodeTrustedToolProfile
];