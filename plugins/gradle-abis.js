/**
 * Config plugin: keep only the Android ABIs real phones use.
 *
 * React Native defaults to packaging four ABI sets (armeabi-v7a, arm64-v8a,
 * x86, x86_64). x86/x86_64 exist for emulators and the rare Intel phone —
 * shipping them doubles the APK for no benefit on real devices. Setting the
 * `reactNativeArchitectures` gradle property (which the generated
 * app/build.gradle reads via reactNativeArchitectures()) trims the packaged
 * .so libraries to ARM only, cutting the download roughly in half while
 * staying compatible with every shipping phone.
 */
const { withGradleProperties } = require('expo/config-plugins');

const TARGET_ARCHES = 'arm64-v8a,armeabi-v7a';

module.exports = function gradleAbisPlugin(config) {
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults.filter((p) => p && p.type === 'property' && p.key !== 'reactNativeArchitectures');
    props.push({ type: 'property', key: 'reactNativeArchitectures', value: TARGET_ARCHES });
    mod.modResults = props;
    return mod;
  });
};
