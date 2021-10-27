/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const rollup = require('rollup');
const rollupPlugins = require('./rollup-plugins.js');
const fs = require('fs');
const {LH_ROOT} = require('../root.js');
const {getIcuMessageIdParts} = require('../shared/localization/format.js');

/**
 * Extract only the strings needed for the flow report into
 * a script that sets a global variable `strings`, whose keys
 * are locale codes (en-US, es, etc.) and values are localized UIStrings.
 */
function buildFlowStrings() {
  console.time('buildFlowStrings');
  const locales = require('../shared/localization/locales.js');
  // TODO(esmodules): use dynamic import when build/ is esm.
  const i18nCode = fs.readFileSync(`${LH_ROOT}/flow-report/src/i18n/ui-strings.js`, 'utf-8');
  const UIStrings = eval(i18nCode.replace(/export /g, '') + '\nmodule.exports = UIStrings;');
  const strings = /** @type {Record<LH.Locale, string>} */ ({});

  for (const [locale, lhlMessages] of Object.entries(locales)) {
    const localizedStrings = Object.fromEntries(
      Object.entries(lhlMessages).map(([icuMessageId, v]) => {
        const {filename, key} = getIcuMessageIdParts(icuMessageId);
        if (!filename.endsWith('ui-strings.js') || !(key in UIStrings)) {
          return [];
        }

        return [key, v.message];
      })
    );
    strings[/** @type {LH.Locale} */ (locale)] = localizedStrings;
  }


  console.timeEnd('buildFlowStrings');
  return 'export default ' + JSON.stringify(strings, null, 2) + ';';
}

async function buildStandaloneReport() {
  console.time('buildStandaloneReport');
  const bundle = await rollup.rollup({
    input: 'report/clients/standalone.js',
    perf: true,
    plugins: [
      rollupPlugins.commonjs(),
      rollupPlugins.terser(),
    ],
  });

  await bundle.write({
    file: 'dist/report/standalone.js',
    format: 'iife',
  });
  console.log('buildStandaloneReport timings', bundle.getTimings());
  console.timeEnd('buildStandaloneReport');
}

async function buildFlowReport() {
  console.time('buildFlowReport');
  const bundle = await rollup.rollup({
    input: 'flow-report/standalone-flow.tsx',
    perf: true,
    plugins: [
      rollupPlugins.replace({
        '__dirname': '""',
      }),
      rollupPlugins.shim({
        [`${LH_ROOT}/flow-report/src/i18n/localized-strings`]: buildFlowStrings(),
        [`${LH_ROOT}/shared/localization/locales.js`]: 'export default {}',
        'fs': 'export default {}',
      }),
      rollupPlugins.nodeResolve(),
      rollupPlugins.commonjs(),
      rollupPlugins.typescript({
        tsconfig: 'flow-report/tsconfig.json',
        // Plugin struggles with custom outDir, so revert it from tsconfig value
        // as well as any options that require an outDir is set.
        outDir: null,
        composite: false,
        emitDeclarationOnly: false,
        declarationMap: false,
      }),
      rollupPlugins.terser(),
    ],
  });

  await bundle.write({
    file: 'dist/report/flow.js',
    format: 'iife',
  });
  console.log('buildFlowReport timings', bundle.getTimings());
  console.timeEnd('buildFlowReport');
}

async function buildEsModulesBundle() {
  console.time('buildEsModulesBundle');
  const bundle = await rollup.rollup({
    input: 'report/clients/bundle.js',
    perf: true,
    plugins: [
      rollupPlugins.commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/bundle.esm.js',
    format: 'esm',
  });
  console.log('esm', bundle.getTimings());
  console.log('buildEsModulesBundle timings', bundle.getTimings());
  console.timeEnd('buildEsModulesBundle');
}

async function buildUmdBundle() {
  console.time('buildUmdBundle');
  const bundle = await rollup.rollup({
    input: 'report/clients/bundle.js',
    perf: true,
    plugins: [
      rollupPlugins.commonjs(),
      rollupPlugins.terser({
        format: {
          beautify: true,
        },
      }),
    ],
  });

  await bundle.write({
    file: 'dist/report/bundle.umd.js',
    format: 'umd',
    name: 'report',
  });
  console.log('buildUmdBundle timings', bundle.getTimings());
  console.timeEnd('buildUmdBundle');
}

if (require.main === module) {
  // Build all 4 in parallel, if there's no argv
  if (process.argv.length <= 2) {
    // NOTE that these fns are async, however we do NOT await them because we want them building in parallel!
    buildStandaloneReport();
    buildFlowReport();
    buildEsModulesBundle();
    buildUmdBundle();
  }


  if (process.argv.includes('--standalone')) {
    buildStandaloneReport();
  }
  if (process.argv.includes('--flow')) {
    buildFlowReport();
  }
  if (process.argv.includes('--esm')) {
    buildEsModulesBundle();
  }
  if (process.argv.includes('--umd')) {
    buildUmdBundle();
  }
}

module.exports = {
  buildStandaloneReport,
  buildFlowReport,
  buildUmdBundle,
};
