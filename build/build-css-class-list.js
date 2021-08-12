/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const fs = require('fs');
const CssSelectorParser = require('css-selector-parser').CssSelectorParser;
const jsdom = require('jsdom');
const {LH_ROOT} = require('../root.js');

// Read report CSS from a sample-report and also from templates.html (as JSDOM won't execute the JS that'd inject their styles)
const sampleStandaloneHtml = fs.readFileSync(`${LH_ROOT}/dist/now/english/index.html`, 'utf-8');
const templatesHtml = fs.readFileSync(`${LH_ROOT}/report/assets/templates.html`, 'utf-8');

/**
 * First step, extract selectors from stylesheets
 * @param {string} html
 */
function getSelectorsFromStyleSheets(html) {
  const {window} = new jsdom.JSDOM(html);

  // unwrap any <template> tags
  Array.from(window.document.querySelectorAll('template')).forEach(templateElem => {
    window.document.body.append(templateElem.content.cloneNode(true));
  });

  const selectors = Array.from(window.document.styleSheets)
    .flatMap(sheet => Array.from(sheet.cssRules || []))
    .map(rule => /** @type {CSSStyleRule} */ (rule).selectorText)
    .filter(Boolean);
  return selectors;
}
const foundSelectors = [];
foundSelectors.push(...getSelectorsFromStyleSheets(sampleStandaloneHtml));
foundSelectors.push(...getSelectorsFromStyleSheets(templatesHtml));
const uniqSelectors = Array.from(new Set(foundSelectors));

// Shout out to alecxe for the pattern. https://stackoverflow.com/a/38422908/89484
const selectorParser = new CssSelectorParser();
selectorParser.registerSelectorPseudos('has', 'contains', 'not', 'is');
selectorParser.registerNestingOperators('>', '+', '~');
selectorParser.registerAttrEqualityMods('^', '$', '*', '~');
selectorParser.enableSubstitutes();

/**
 * Second step, extract classNames from selectors
 * @param {string} selector
 * @returns
 */
function parseSelectorIntoClassNames(selector) {
  const result = selectorParser.parse(selector);
  /** @type {Array<string>} */
  const classNamesInSelector = [];

  /**
   * Recursively walk child rules: With `.foo .bar`, bar will be a child rule
   * @param {import('css-selector-parser').Rule | undefined} rule
   */
  function walkRules(rule) {
    while (rule) {
      classNamesInSelector.push(...extractRuleClassNames(rule));
      rule = rule.rule;
    }
  }

  if (result.type === 'ruleSet') {
    walkRules(result.rule);
  } else if (result.type === 'selectors' && result.selectors) {
    for (const selector of result.selectors) {
      walkRules(selector.rule);
    }
  }
  return classNamesInSelector;
}

/**
 * @param {import('css-selector-parser').Rule} rule
 * @return {Array<String>}
 */
function extractRuleClassNames(rule) {
  const classNames = [];
  // extract class names defined with ".", e.g. .myclass
  if (rule.classNames) {
    classNames.push(...rule.classNames);
  }
  // extract class names defined in attributes, e.g. [class*=myclass]
  if (rule.attrs) {
    rule.attrs.forEach(function(attr) {
      if (attr.name === 'class') {
        // @ts-expect-error css-selector-parser's types are dumbzo.
        classNames.push(attr.value);
      }
    });
  }
  return classNames;
}

const allClassNames = uniqSelectors.flatMap(parseSelectorIntoClassNames);
const uniqClassNames = Array.from(new Set(allClassNames)).sort();

const uniqClassNamesTxt = `
# All class names used by the Lighthouse report

${uniqClassNames.join('\n')}
`;
fs.writeFileSync(`${LH_ROOT}/dist/report/css_class_list.txt`, uniqClassNamesTxt, 'utf-8');
