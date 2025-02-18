/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const ComputedResponsivenes = require('../computed/metrics/responsiveness.js');
const ProcessedTrace = require('../computed/processed-trace.js');
const i18n = require('../lib/i18n/i18n.js');
const NetworkRecords = require('../computed/network-records.js');
const MainThreadTasks = require('../lib/tracehouse/main-thread-tasks.js');
const {taskGroups} = require('../lib/tracehouse/task-groups.js');
const TraceProcessor = require('../lib/tracehouse/trace-processor.js');
const {getExecutionTimingsByURL} = require('../lib/tracehouse/task-summary.js');
const inpThresholds = require('./metrics/experimental-interaction-to-next-paint.js').defaultOptions;

/** @typedef {import('../computed/metrics/responsiveness.js').EventTimingEvent} EventTimingEvent */
/** @typedef {import('../lib/tracehouse/main-thread-tasks.js').TaskNode} TaskNode */

const TASK_THRESHOLD = 1;

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did during a key user interaction. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Minimizes work during key interaction',
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did during a key user interaction. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Minimize work during key interaction',
  /** Description of the work-during-interaction metric. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'This is the thread-blocking work occurring during the Interaction to Next Paint measurement. [Learn more](https://web.dev/inp/).',
  /** Label for a column in a data table; entries will be information on the time that the browser is delayed before responding to user input. Ideally fits within a ~40 character limit. */
  inputDelay: 'Input delay',
  /** Label for a column in a data table; entries will be information on the time taken by code processing user input that delays a response to the user. Ideally fits within a ~40 character limit. */
  processingDelay: 'Processing delay',
  /** Label for a column in a data table; entries will be information on the time that the browser is delayed before presenting a response to user input on screen. Ideally fits within a ~40 character limit. */
  presentationDelay: 'Presentation delay',
  /**
   * @description Summary text that identifies the time the browser took to process a user interaction.
   * @example {mousedown} interactionType
   */
  displayValue: `{timeInMs, number, milliseconds}\xa0ms spent on event '{interactionType}'`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview This metric gives a high-percentile measure of responsiveness to input.
 */
class WorkDuringInteraction extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'work-during-interaction',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['timespan'],
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {TaskNode} task
   * @param {TaskNode|undefined} parent
   * @param {number} startTs
   * @param {number} endTs
   * @return {number}
   */
  static recursivelyClipTasks(task, parent, startTs, endTs) {
    const taskEventStart = task.event.ts;
    const taskEventEnd = task.endEvent?.ts ?? task.event.ts + Number(task.event.dur || 0);

    task.startTime = Math.max(startTs, Math.min(endTs, taskEventStart)) / 1000;
    task.endTime = Math.max(startTs, Math.min(endTs, taskEventEnd)) / 1000;
    task.duration = task.endTime - task.startTime;

    const childTime = task.children
      .map(child => WorkDuringInteraction.recursivelyClipTasks(child, task, startTs, endTs))
      .reduce((sum, child) => sum + child, 0);
    task.selfTime = task.duration - childTime;
    return task.duration;
  }

  /**
   * Clip the tasks by the start and end points. Take the easy route and drop
   * to duration 0 if out of bounds, since only durations are needed in the
   * end (for now).
   * Assumes owned tasks, so modifies in place. Can be called multiple times on
   * the same `tasks` because always computed from original event timing.
   * @param {Array<TaskNode>} tasks
   * @param {number} startTs
   * @param {number} endTs
   */
  static clipTasksByTs(tasks, startTs, endTs) {
    for (const task of tasks) {
      if (task.parent) continue;
      WorkDuringInteraction.recursivelyClipTasks(task, undefined, startTs, endTs);
    }
  }

  /**
   * @param {EventTimingEvent} interactionEvent
   */
  static getPhaseTimes(interactionEvent) {
    const interactionData = interactionEvent.args.data;
    const startTs = interactionEvent.ts;
    const navStart = startTs - interactionData.timeStamp * 1000;
    const processingStartTs = navStart + interactionData.processingStart * 1000;
    const processingEndTs = navStart + interactionData.processingEnd * 1000;
    const endTs = startTs + interactionData.duration * 1000;
    return {
      inputDelay: {startTs, endTs: processingStartTs},
      processingDelay: {startTs: processingStartTs, endTs: processingEndTs},
      presentationDelay: {startTs: processingEndTs, endTs},
    };
  }

  /**
   * @param {EventTimingEvent} interactionEvent
   * @param {LH.Trace} trace
   * @param {LH.Artifacts.ProcessedTrace} processedTrace
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {{table: LH.Audit.Details.Table, phases: Record<string, {startTs: number, endTs: number}>}}
   */
  static eventThreadBreakdown(interactionEvent, trace, processedTrace, networkRecords) {
    // Limit to interactionEvent's thread.
    // TODO(bckenny): limit to interactionEvent's navigation.
    const threadEvents = TraceProcessor.filteredTraceSort(trace.traceEvents, evt => {
      return evt.pid === interactionEvent.pid && evt.tid === interactionEvent.tid;
    });
    const traceEndTs = threadEvents.reduce((endTs, evt) => {
      return Math.max(evt.ts + (evt.dur || 0), endTs);
    }, 0);
    // frames is only used for URL attribution, so can include all frames, even if OOPIF.
    const {frames} = processedTrace;
    const threadTasks = MainThreadTasks.getMainThreadTasks(threadEvents, frames, traceEndTs);

    const phases = WorkDuringInteraction.getPhaseTimes(interactionEvent);

    /** @type {LH.Audit.Details.TableItem[]} */
    const items = [];
    for (const [phaseName, phaseTimes] of Object.entries(phases)) {
      // Clip tasks to start and end time.
      WorkDuringInteraction.clipTasksByTs(threadTasks, phaseTimes.startTs, phaseTimes.endTs);
      const executionTimings = getExecutionTimingsByURL(threadTasks, networkRecords);

      const results = [];
      for (const [url, timingByGroupId] of executionTimings) {
        const totalExecutionTimeForURL = Object.values(timingByGroupId)
            .reduce((total, timespanMs) => total + timespanMs);

        const scriptingTotal = timingByGroupId[taskGroups.scriptEvaluation.id] || 0;
        const layoutTotal = timingByGroupId[taskGroups.styleLayout.id] || 0;
        const renderTotal = timingByGroupId[taskGroups.paintCompositeRender.id] || 0;

        results.push({
          url: url,
          total: totalExecutionTimeForURL,
          scripting: scriptingTotal,
          layout: layoutTotal,
          render: renderTotal,
        });
      }

      const filteredResults = results
        .filter(result => result.total > TASK_THRESHOLD)
        .sort((a, b) => b.total - a.total);

      items.push({
        phase: str_(UIStrings[/** @type {keyof UIStrings} */ (phaseName)]),
        total: (phaseTimes.endTs - phaseTimes.startTs) / 1000,
        subItems: {
          type: 'subitems',
          items: filteredResults,
        },
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'phase', itemType: 'text', subItemsHeading: {key: 'url', itemType: 'url'}, text: 'Phase'},
      {key: 'total', itemType: 'ms', subItemsHeading: {key: 'total', granularity: 1, itemType: 'ms'}, granularity: 1, text: 'Total time'},
      {key: null, itemType: 'ms', subItemsHeading: {key: 'scripting', granularity: 1, itemType: 'ms'}, text: 'Script evaluation'},
      {key: null, itemType: 'ms', subItemsHeading: {key: 'layout', granularity: 1, itemType: 'ms'}, text: taskGroups.styleLayout.label},
      {key: null, itemType: 'ms', subItemsHeading: {key: 'render', granularity: 1, itemType: 'ms'}, text: taskGroups.paintCompositeRender.label},
      /* eslint-enable max-len */
    ];

    return {
      table: Audit.makeTableDetails(headings, items),
      phases,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {settings} = context;
    // TODO: responsiveness isn't yet supported by lantern.
    if (settings.throttlingMethod === 'simulate') {
      return {score: null, notApplicable: true};
    }

    const trace = artifacts.traces[WorkDuringInteraction.DEFAULT_PASS];
    const metricData = {trace, settings};
    const interactionEvent = await ComputedResponsivenes.request(metricData, context);
    // If no interaction, diagnostic audit is n/a.
    if (interactionEvent === null) {
      return {score: null, notApplicable: true};
    }

    const devtoolsLog = artifacts.devtoolsLogs[WorkDuringInteraction.DEFAULT_PASS];
    // Network records will usually be empty for timespans.
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const processedTrace = await ProcessedTrace.request(trace, context);
    const {table, phases} = WorkDuringInteraction.eventThreadBreakdown(
          interactionEvent, trace, processedTrace, networkRecords);

    const duration = interactionEvent.args.data.duration;
    const interactionType = interactionEvent.args.data.type;
    const displayValue = str_(UIStrings.displayValue, {timeInMs: duration, interactionType});

    return {
      score: duration < inpThresholds.p10 ? 1 : 0,
      displayValue,
      details: {
        ...table,
        debugData: {
          type: 'debugdata',
          interactionType,
          phases,
        },
      },
    };
  }
}

module.exports = WorkDuringInteraction;
module.exports.UIStrings = UIStrings;
