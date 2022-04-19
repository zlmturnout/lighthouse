/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const log = require('lighthouse-logger');
const Runner = require('../../runner.js');
const defaultConfig = require('./default-config.js');
const {nonSimulatedPassConfigOverrides} = require('../../config/constants.js'); // eslint-disable-line max-len
const {
  isFRGathererDefn,
  throwInvalidDependencyOrder,
  isValidArtifactDependency,
  throwInvalidArtifactDependency,
  assertValidConfig,
} = require('./validation.js');
const {filterConfigByGatherMode, filterConfigByExplicitFilters} = require('./filters.js');
const {
  deepCloneConfigJson,
  resolveSettings,
  resolveAuditsToDefns,
  resolveGathererToDefn,
  mergePlugins,
  mergeConfigFragment,
  mergeConfigFragmentArrayByKey,
} = require('../../config/config-helpers.js');
const defaultConfigPath = path.join(__dirname, './default-config.js');

/** @typedef {LH.Config.FRContext & {gatherMode: LH.Gatherer.GatherMode}} ConfigContext */

/**
 * @param {LH.Config.Json|undefined} configJSON
 * @param {{configPath?: string}} context
 * @return {{configWorkingCopy: LH.Config.Json, configDir?: string, configPath?: string}}
 */
function resolveWorkingCopy(configJSON, context) {
  let {configPath} = context;

  if (configPath && !path.isAbsolute(configPath)) {
    throw new Error('configPath must be an absolute path');
  }

  if (!configJSON) {
    configJSON = defaultConfig;
    configPath = defaultConfigPath;
  }

  // The directory of the config path, if one was provided.
  const configDir = configPath ? path.dirname(configPath) : undefined;

  return {
    configWorkingCopy: deepCloneConfigJson(configJSON),
    configPath,
    configDir,
  };
}

/**
 * @param {LH.Config.Json} configJSON
 * @return {LH.Config.Json}
 */
function resolveExtensions(configJSON) {
  if (!configJSON.extends) return configJSON;

  if (configJSON.extends !== 'lighthouse:default') {
    throw new Error('`lighthouse:default` is the only valid extension method.');
  }

  const {artifacts, ...extensionJSON} = configJSON;
  const defaultClone = deepCloneConfigJson(defaultConfig);
  const mergedConfig = mergeConfigFragment(defaultClone, extensionJSON);

  mergedConfig.artifacts = mergeConfigFragmentArrayByKey(
    defaultClone.artifacts,
    artifacts,
    artifact => artifact.id
  );

  return mergedConfig;
}

/**
 * Looks up the required artifact IDs for each dependency, throwing if no earlier artifact satisfies the dependency.
 *
 * @param {LH.Config.ArtifactJson} artifact
 * @param {LH.Config.AnyFRGathererDefn} gatherer
 * @param {Map<Symbol, LH.Config.AnyArtifactDefn>} artifactDefnsBySymbol
 * @return {LH.Config.AnyArtifactDefn['dependencies']}
 */
function resolveArtifactDependencies(artifact, gatherer, artifactDefnsBySymbol) {
  if (!('dependencies' in gatherer.instance.meta)) return undefined;

  const dependencies = Object.entries(gatherer.instance.meta.dependencies).map(
      ([dependencyName, artifactSymbol]) => {
        const dependency = artifactDefnsBySymbol.get(artifactSymbol);

        // Check that dependency was defined before us.
        if (!dependency) throwInvalidDependencyOrder(artifact.id, dependencyName);

        // Check that the phase relationship is OK too.
        const validDependency = isValidArtifactDependency(gatherer, dependency.gatherer);
        if (!validDependency) throwInvalidArtifactDependency(artifact.id, dependencyName);

        return [dependencyName, {id: dependency.id}];
      }
  );

  return Object.fromEntries(dependencies);
}

/**
 *
 * @param {LH.Config.ArtifactJson[]|null|undefined} artifacts
 * @param {string|undefined} configDir
 * @return {LH.Config.AnyArtifactDefn[] | null}
 */
function resolveArtifactsToDefns(artifacts, configDir) {
  if (!artifacts) return null;

  const status = {msg: 'Resolve artifact definitions', id: 'lh:config:resolveArtifactsToDefns'};
  log.time(status, 'verbose');

  /** @type {Map<Symbol, LH.Config.AnyArtifactDefn>} */
  const artifactDefnsBySymbol = new Map();

  const coreGathererList = Runner.getGathererList();
  const artifactDefns = artifacts.map(artifactJson => {
    /** @type {LH.Config.GathererJson} */
    // @ts-expect-error - remove when legacy runner path is removed.
    const gathererJson = artifactJson.gatherer;

    const gatherer = resolveGathererToDefn(gathererJson, coreGathererList, configDir);
    if (!isFRGathererDefn(gatherer)) {
      throw new Error(`${gatherer.instance.name} gatherer does not have a Fraggle Rock meta obj`);
    }

    /** @type {LH.Config.AnyArtifactDefn} */
    // @ts-expect-error - Typescript can't validate the gatherer and dependencies match
    // even though it knows that they're each valid on their own.
    const artifact = {
      id: artifactJson.id,
      gatherer,
      dependencies: resolveArtifactDependencies(artifactJson, gatherer, artifactDefnsBySymbol),
    };

    const symbol = artifact.gatherer.instance.meta.symbol;
    if (symbol) artifactDefnsBySymbol.set(symbol, artifact);
    return artifact;
  });

  log.timeEnd(status);
  return artifactDefns;
}

/**
 * Overrides the settings that may not apply to the chosen gather mode.
 *
 * @param {LH.Config.Settings} settings
 * @param {ConfigContext} context
 */
function overrideSettingsForGatherMode(settings, context) {
  if (context.gatherMode === 'timespan') {
    if (settings.throttlingMethod === 'simulate') {
      settings.throttlingMethod = 'devtools';
    }
  }
}

/**
 * Overrides the quiet windows when throttlingMethod requires observation.
 *
 * @param {LH.Config.Settings} settings
 */
function overrideSettingsThrottlingWindows(settings) {
  if (settings.throttlingMethod === 'simulate') return;

  settings.cpuQuietThresholdMs = Math.max(
    settings.cpuQuietThresholdMs || 0,
    nonSimulatedPassConfigOverrides.cpuQuietThresholdMs
  );
  settings.networkQuietThresholdMs = Math.max(
    settings.networkQuietThresholdMs || 0,
    nonSimulatedPassConfigOverrides.networkQuietThresholdMs
  );
  settings.pauseAfterFcpMs = Math.max(
    settings.pauseAfterFcpMs || 0,
    nonSimulatedPassConfigOverrides.pauseAfterFcpMs
  );
  settings.pauseAfterLoadMs = Math.max(
    settings.pauseAfterLoadMs || 0,
    nonSimulatedPassConfigOverrides.pauseAfterLoadMs
  );
}

/**
 * @param {LH.Config.Json|undefined} configJSON
 * @param {ConfigContext} context
 * @return {{config: LH.Config.FRConfig}}
 */
function initializeConfig(configJSON, context) {
  const status = {msg: 'Initialize config', id: 'lh:config'};
  log.time(status, 'verbose');

  let {configWorkingCopy, configDir} = resolveWorkingCopy(configJSON, context); // eslint-disable-line prefer-const

  configWorkingCopy = resolveExtensions(configWorkingCopy);
  configWorkingCopy = mergePlugins(configWorkingCopy, configDir, context.settingsOverrides);

  const settings = resolveSettings(configWorkingCopy.settings || {}, context.settingsOverrides);
  overrideSettingsForGatherMode(settings, context);

  const artifacts = resolveArtifactsToDefns(configWorkingCopy.artifacts, configDir);
  overrideSettingsThrottlingWindows(settings);

  /** @type {LH.Config.FRConfig} */
  let config = {
    artifacts,
    audits: resolveAuditsToDefns(configWorkingCopy.audits, configDir),
    categories: configWorkingCopy.categories || null,
    groups: configWorkingCopy.groups || null,
    settings,
  };

  assertValidConfig(config);

  config = filterConfigByGatherMode(config, context.gatherMode);
  config = filterConfigByExplicitFilters(config, settings);

  log.timeEnd(status);
  return {config};
}

module.exports = {resolveWorkingCopy, initializeConfig};
