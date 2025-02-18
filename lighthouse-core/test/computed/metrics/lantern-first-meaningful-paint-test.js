/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import {strict as assert} from 'assert';

import trace from '../../fixtures/traces/progressive-app-m60.json';
import devtoolsLog from '../../fixtures/traces/progressive-app-m60.devtools.log.json';
import LanternFirstMeaningfulPaint from
  '../../../computed/metrics/lantern-first-meaningful-paint.js';
import {getURLArtifactFromDevtoolsLog} from '../../test-utils.js';

const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
describe('Metrics: Lantern FMP', () => {
  it('should compute predicted value', async () => {
    const gatherContext = {gatherMode: 'navigation'};
    const computedCache = new Map();
    const result = await LanternFirstMeaningfulPaint.request({trace, devtoolsLog, gatherContext,
      settings: {}, URL}, {computedCache});

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
    assert.equal(result.optimisticEstimate.nodeTimings.size, 6);
    assert.equal(result.pessimisticEstimate.nodeTimings.size, 9);
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });
});
