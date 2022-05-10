/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-disable no-irregular-whitespace */

import WorkDuringInteraction from '../../audits/work-during-interaction.js';
import interactionTrace from '../fixtures/traces/timespan-responsiveness-m103.trace.json';
import noInteractionTrace from '../fixtures/traces/jumpy-cls-m90.json';

describe('Interaction to Next Paint', () => {
  function getTestData() {
    const artifacts = {
      traces: {
        [WorkDuringInteraction.DEFAULT_PASS]: interactionTrace,
      },
      devtoolsLogs: {
        [WorkDuringInteraction.DEFAULT_PASS]: [],
      },
      TraceElements: [{
        traceEventType: 'responsiveness',
        node: {
          lhId: 'page-0-INPUT',
          devtoolsNodePath: '1,HTML,1,BODY,1,INPUT',
          selector: 'body > input#events-typey',
          boundingRect: {top: 160, bottom: 181, left: 8, right: 592, width: 584, height: 22},
          snippet: '<input type="text" placeholder="Typey" id="events-typey">',
          nodeLabel: 'body > input#events-typey',
        },
        nodeId: 10,
      }],
    };

    const context = {
      settings: {throttlingMethod: 'devtools'},
      computedCache: new Map(),
      options: WorkDuringInteraction.defaultOptions,
    };

    return {artifacts, context};
  }

  it('evaluates INP correctly', async () => {
    const {artifacts, context} = getTestData();
    const result = await WorkDuringInteraction.audit(artifacts, context);
    expect(result).toMatchInlineSnapshot(`
Object {
  "details": Object {
    "items": Array [
      Object {
        "headings": Array [
          Object {
            "itemType": "node",
            "key": "node",
            "text": Object {
              "formattedDefault": "Event target",
              "i18nId": "lighthouse-core/audits/work-during-interaction.js | eventTarget",
              "values": undefined,
            },
          },
        ],
        "items": Array [
          Object {
            "node": Object {
              "boundingRect": Object {
                "bottom": 181,
                "height": 22,
                "left": 8,
                "right": 592,
                "top": 160,
                "width": 584,
              },
              "lhId": "page-0-INPUT",
              "nodeLabel": "body > input#events-typey",
              "path": "1,HTML,1,BODY,1,INPUT",
              "selector": "body > input#events-typey",
              "snippet": "<input type=\\"text\\" placeholder=\\"Typey\\" id=\\"events-typey\\">",
              "type": "node",
            },
          },
        ],
        "summary": undefined,
        "type": "table",
      },
      Object {
        "headings": Array [
          Object {
            "itemType": "text",
            "key": "phase",
            "subItemsHeading": Object {
              "itemType": "url",
              "key": "url",
            },
            "text": "Phase",
          },
          Object {
            "granularity": 1,
            "itemType": "ms",
            "key": "total",
            "subItemsHeading": Object {
              "granularity": 1,
              "itemType": "ms",
              "key": "total",
            },
            "text": "Total time",
          },
          Object {
            "itemType": "ms",
            "key": null,
            "subItemsHeading": Object {
              "granularity": 1,
              "itemType": "ms",
              "key": "scripting",
            },
            "text": "Script evaluation",
          },
          Object {
            "itemType": "ms",
            "key": null,
            "subItemsHeading": Object {
              "granularity": 1,
              "itemType": "ms",
              "key": "layout",
            },
            "text": "Style & Layout",
          },
          Object {
            "itemType": "ms",
            "key": null,
            "subItemsHeading": Object {
              "granularity": 1,
              "itemType": "ms",
              "key": "render",
            },
            "text": "Rendering",
          },
        ],
        "items": Array [
          Object {
            "phase": Object {
              "formattedDefault": "Input delay",
              "i18nId": "lighthouse-core/audits/work-during-interaction.js | inputDelay",
              "values": undefined,
            },
            "subItems": Object {
              "items": Array [
                Object {
                  "layout": 0,
                  "render": 0,
                  "scripting": 39.855000019073486,
                  "total": 40.68599998950958,
                  "url": "http://localhost:10200/events.html",
                },
                Object {
                  "layout": 0,
                  "render": 0,
                  "scripting": 0,
                  "total": 1.3049999475479126,
                  "url": "Unattributable",
                },
              ],
              "type": "subitems",
            },
            "total": 42,
          },
          Object {
            "phase": Object {
              "formattedDefault": "Processing delay",
              "i18nId": "lighthouse-core/audits/work-during-interaction.js | processingDelay",
              "values": undefined,
            },
            "subItems": Object {
              "items": Array [
                Object {
                  "layout": 0,
                  "render": 0,
                  "scripting": 40.6599999666214,
                  "total": 41,
                  "url": "http://localhost:10200/events.html",
                },
              ],
              "type": "subitems",
            },
            "total": 41,
          },
          Object {
            "phase": Object {
              "formattedDefault": "Presentation delay",
              "i18nId": "lighthouse-core/audits/work-during-interaction.js | presentationDelay",
              "values": undefined,
            },
            "subItems": Object {
              "items": Array [
                Object {
                  "layout": 0,
                  "render": 0,
                  "scripting": 272.8389996290207,
                  "total": 278.7499998807907,
                  "url": "http://localhost:10200/events.html",
                },
                Object {
                  "layout": 0,
                  "render": 0,
                  "scripting": 0.03100001811981201,
                  "total": 2.01800000667572,
                  "url": "Unattributable",
                },
              ],
              "type": "subitems",
            },
            "total": 285,
          },
        ],
        "summary": undefined,
        "type": "table",
      },
      Object {
        "interactionType": "mousedown",
        "phases": Object {
          "inputDelay": Object {
            "endTs": 633282608296,
            "startTs": 633282566296,
          },
          "presentationDelay": Object {
            "endTs": 633282934296,
            "startTs": 633282649296,
          },
          "processingDelay": Object {
            "endTs": 633282649296,
            "startTs": 633282608296,
          },
        },
        "type": "debugdata",
      },
    ],
    "type": "list",
  },
  "displayValue": Object {
    "formattedDefault": "370 ms spent on event 'mousedown'",
    "i18nId": "lighthouse-core/audits/work-during-interaction.js | displayValue",
    "values": Object {
      "interactionType": "mousedown",
      "timeInMs": 368,
    },
  },
  "score": 0,
}
`);
  });

  it('is not applicable if using simulated throttling', async () => {
    const {artifacts, context} = getTestData();
    context.settings.throttlingMethod = 'simulate';
    const result = await WorkDuringInteraction.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });

  it('is not applicable if no interactions occurred in trace', async () => {
    const {artifacts, context} = getTestData();
    artifacts.traces[WorkDuringInteraction.DEFAULT_PASS] = noInteractionTrace;
    const result = await WorkDuringInteraction.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });
});
