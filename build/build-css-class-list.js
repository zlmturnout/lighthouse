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


/** @typedef  RuleModule */


const foundSelectors = [];

const sampleStandaloneHtml = fs.readFileSync(`${LH_ROOT}/dist/now/english/index.html`, 'utf-8');
const templatesHtml = fs.readFileSync(`${LH_ROOT}/report/assets/templates.html`, 'utf-8');

/**
 *
 * @param {string} html
 */
function getSelectorsFromStyleSheets(html) {
  const {window} = new jsdom.JSDOM(html);

  // unwrap any <template> tags
  Array.from(window.document.querySelectorAll('template')).forEach(templateElem => {
    console.log(templateElem.id);
    window.document.body.append(templateElem.content.cloneNode(true));
  });

  const selectors =
      Array.from(window.document.styleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules || []))
        .map(rule => /** @type {CSSStyleRule} */ (rule).selectorText)
        .filter(Boolean);
  console.log({selectors});
  return selectors;
}

foundSelectors.push(...getSelectorsFromStyleSheets(sampleStandaloneHtml));
foundSelectors.push(...getSelectorsFromStyleSheets(templatesHtml));

const uniqSelectors = Array.from(
  new Set(foundSelectors));

const parser = new CssSelectorParser();
parser.registerSelectorPseudos('has', 'contains', 'not');
parser.registerNestingOperators('>', '+', '~');
parser.registerAttrEqualityMods('^', '$', '*', '~');
parser.enableSubstitutes();


// Shout out to alecxe. https://stackoverflow.com/a/38422908/89484
/**
 * @param {import('css-selector-parser').Rule} rule
 * @returns
 */
function extractRuleClassNames(rule) {
  if (JSON.stringify(rule).includes('lh-chevron__line-left')) {
    console.trace();
    console.log('HIHSIHIH', JSON.stringify(rule, null, 2));
  }

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

/**
 *
 * @param {string} selector
 * @returns
 */
function processSelector(selector) {
  const classNamesInSelector = [];
  const result = parser.parse(selector);

  if (result.type === 'ruleSet') {
    /** @type {import('css-selector-parser').Rule | undefined} */
    let rule = result.rule;
    while (rule) {
      classNamesInSelector.push(...extractRuleClassNames(rule));
      rule = rule.rule;
    }
  } else if (result.type === 'selectors' && result.selectors) {
    result.selectors.forEach(function(selector) {
      /** @type {import('css-selector-parser').Rule | undefined} */
      let rule = selector.rule;
      while (rule) {
        classNamesInSelector.push(...extractRuleClassNames(rule));
        rule = rule.rule;
      }
    });
  }
  return classNamesInSelector;
}


// TODO
// lh-snippet--expanded


const allClassNames = [];
for (const selector of uniqSelectors) {
  const classNames = processSelector(selector);
  allClassNames.push(...classNames);
}

const uniqClassNames = Array.from(new Set(allClassNames)).sort();

const uniqClassNamesTxt = `
# All class names used by the Lighthouse report

${uniqClassNames.join('\n')}
`;
fs.writeFileSync(`${LH_ROOT}/dist/report/css_class_list.txt`, uniqClassNamesTxt, 'utf-8');
console.log('Wrote dist/report/css_class_list.txt');


