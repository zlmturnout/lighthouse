/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Common report components can be created with the DOM methods below.
 * These components were ported from report/assets/templates.html where each component had lived as
 * HTML, however writing that file as HTML introduced many challenges for report embedders.
 *
 * Thanks very much to https://domtool.yakshavings.co.uk/ for enabling this HTML=>DOM conversion
 */

/* global self */
/** @typedef {import('./dom.js')} DOM */

/**
 *
 * @param {DOM} dom
 * @return {HTMLDivElement}
 */
function scorescale(dom) {
  const div1 = dom.createElement('div');
  div1.className = 'lh-scorescale';

  const ranges = [
    ['lh-scorescale-range--fail', '0–49'],
    ['lh-scorescale-range--average', '50–89'],
    ['lh-scorescale-range--pass', '90–100'],
  ];

  for (const [classNameModifier, text] of ranges) {
    const span = dom.createElement('span', `lh-scorescale-range ${classNameModifier}`);
    span.textContent = text;
    div1.append(span);
  }
  return div1;
}


/**
 *
 * @param {DOM} dom
 * @return {HTMLDivElement}
 */
function topbar(dom) {
  const div1 = dom.createElement('div', 'lh-topbar');

  // LH logo in svg
  const svg1 = dom.createElementSVG('svg', {
    'viewBox': '0 0 24 24',
  });
  svg1.classList.add('lh-topbar__logo');
  div1.append(svg1);
  const defs1 = dom.createElementSVG('defs');
  svg1.append(defs1);
  const lineargradient1 = dom.createElementSVG('linearGradient', {
    'x1': '57.456%',
    'y1': '13.086%',
    'x2': '18.259%',
    'y2': '72.322%',
    'id': 'lh-topbar__logo--a',
  });
  defs1.append(lineargradient1);
  const stop1 = dom.createElementSVG('stop', {
    'stop-color': '#262626',
    'stop-opacity': '.1',
    'offset': '0%',
  });
  lineargradient1.append(stop1);
  const stop2 = dom.createElementSVG('stop', {
    'stop-color': '#262626',
    'stop-opacity': '0',
    'offset': '100%',
  });
  lineargradient1.append(stop2);
  const lineargradient2 = dom.createElementSVG('linearGradient', {
    'x1': '100%',
    'y1': '50%',
    'x2': '0%',
    'y2': '50%',
    'id': 'lh-topbar__logo--b',
  });
  defs1.append(lineargradient2);
  const stop3 = dom.createElementSVG('stop', {
    'stop-color': '#262626',
    'stop-opacity': '.1',
    'offset': '0%',
  });
  lineargradient2.append(stop3);
  const stop4 = dom.createElementSVG('stop', {
    'stop-color': '#262626',
    'stop-opacity': '0',
    'offset': '100%',
  });
  lineargradient2.append(stop4);
  const lineargradient3 = dom.createElementSVG('linearGradient', {
    'x1': '58.764%',
    'y1': '65.756%',
    'x2': '36.939%',
    'y2': '50.14%',
    'id': 'lh-topbar__logo--c',
  });
  defs1.append(lineargradient3);
  const stop5 = dom.createElementSVG('stop', {
    'stop-color': '#262626',
    'stop-opacity': '.1',
    'offset': '0%',
  });
  lineargradient3.append(stop5);
  const stop6 = dom.createElementSVG('stop', {
    'stop-color': '#262626',
    'stop-opacity': '0',
    'offset': '100%',
  });
  lineargradient3.append(stop6);
  const lineargradient4 = dom.createElementSVG('linearGradient', {
    'x1': '41.635%',
    'y1': '20.358%',
    'x2': '72.863%',
    'y2': '85.424%',
    'id': 'lh-topbar__logo--d',
  });
  defs1.append(lineargradient4);
  const stop7 = dom.createElementSVG('stop', {
    'stop-color': '#FFF',
    'stop-opacity': '.1',
    'offset': '0%',
  });
  lineargradient4.append(stop7);
  const stop8 = dom.createElementSVG('stop', {
    'stop-color': '#FFF',
    'stop-opacity': '0',
    'offset': '100%',
  });
  lineargradient4.append(stop8);
  const g1 = dom.createElementSVG('g', {
    'fill': 'none',
    'fill-rule': 'evenodd',
  });
  svg1.append(g1);
  const path1 = dom.createElementSVG('path', {
    'd': 'M12 3l4.125 2.625v3.75H18v2.25h-1.688l1.5 9.375H6.188l1.5-9.375H6v-2.25h1.875V5.648L12 3zm2.201 9.938L9.54 14.633 9 18.028l5.625-2.062-.424-3.028zM12.005 5.67l-1.88 1.207v2.498h3.75V6.86l-1.87-1.19z', // eslint-disable-line max-len
    'fill': '#F44B21',
  });
  g1.append(path1);
  const path2 = dom.createElementSVG('path', {
    'fill': '#FFF',
    'd': 'M14.201 12.938L9.54 14.633 9 18.028l5.625-2.062z',
  });
  g1.append(path2);
  const path3 = dom.createElementSVG('path', {
    'd': 'M6 18c-2.042 0-3.95-.01-5.813 0l1.5-9.375h4.326L6 18z',
    'fill': 'url(#lh-topbar__logo--a)',
    'fill-rule': 'nonzero',
    'transform': 'translate(6 3)',
  });
  g1.append(path3);
  const path4 = dom.createElementSVG('path', {
    'fill': '#FFF176',
    'fill-rule': 'nonzero',
    'd': 'M13.875 9.375v-2.56l-1.87-1.19-1.88 1.207v2.543z',
  });
  g1.append(path4);
  const path5 = dom.createElementSVG('path', {
    'fill': 'url(#lh-topbar__logo--b)',
    'fill-rule': 'nonzero',
    'd': 'M0 6.375h6v2.25H0z',
    'transform': 'translate(6 3)',
  });
  g1.append(path5);
  const path6 = dom.createElementSVG('path', {
    'fill': 'url(#lh-topbar__logo--c)',
    'fill-rule': 'nonzero',
    'd': 'M6 6.375H1.875v-3.75L6 0z',
    'transform': 'translate(6 3)',
  });
  g1.append(path6);
  const path7 = dom.createElementSVG('path', {
    'fill': 'url(#lh-topbar__logo--d)',
    'fill-rule': 'nonzero',
    'd': 'M6 0l4.125 2.625v3.75H12v2.25h-1.688l1.5 9.375H.188l1.5-9.375H0v-2.25h1.875V2.648z',
    'transform': 'translate(6 3)',
  });
  g1.append(path7);


  const a1 = dom.createElement('a', 'lh-topbar__url', {
    'target': '_blank',
    'rel': 'noopener',
  });
  div1.append(a1);
  const div2 = dom.createElement('div', 'lh-tools');
  div1.append(div2);
  const button1 = dom.createElement('button', 'lh-tools__button', {
    'id': 'lh-tools-button',
    'title': 'Tools menu',
    'aria-label': 'Toggle report tools menu',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'aria-controls': 'lh-tools-dropdown',
  });
  div2.append(button1);

  // 3-dots SVG
  const svg2 = dom.createElementSVG('svg', {
    'width': '100%',
    'height': '100%',
    'viewBox': '0 0 24 24',
  });
  button1.append(svg2);
  const path8 = dom.createElementSVG('path', {
    'd': 'M0 0h24v24H0z',
    'fill': 'none',
  });
  svg2.append(path8);
  const path9 = dom.createElementSVG('path', {
    'd': 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z', // eslint-disable-line max-len
  });
  svg2.append(path9);
  const div3 = dom.createElement('div', 'lh-tools__dropdown', {
    'id': 'lh-tools-dropdown',
    'role': 'menu',
    'aria-labelledby': 'lh-tools-button',
  });
  div2.append(div3);

  const menuItems = [
    ['report-icon report-icon--print', 'dropdownPrintSummary', 'print-summary'],
    ['report-icon report-icon--print', 'dropdownPrintExpanded', 'print-expanded'],
    ['report-icon report-icon--copy', 'dropdownCopyJSON', 'copy'],
    ['report-icon report-icon--download', 'dropdownSaveHTML', 'save-html'],
    ['report-icon report-icon--download', 'dropdownSaveJSON', 'save-json'],
    ['report-icon report-icon--open', 'dropdownViewer', 'open-viewer'],
    ['report-icon report-icon--open', 'dropdownSaveGist', 'save-gist'],
    ['report-icon report-icon--dark', 'dropdownDarkTheme', 'toggle-dark'],
  ];

  for (const [className, di18n, action] of menuItems) {
    const a2 = dom.createElement('a', className, {
      'role': 'menuitem',
      'tabindex': '-1',
      'href': '#',
      'data-i18n': di18n,
      'data-action': action,
    });
    div3.append(a2);
  }

  return div1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {scorescale, topbar};
} else {
  self.TemplateComponents = {scorescale, topbar};
}
