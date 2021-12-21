/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import { Result as AuditResult } from "../../types/lhr/audit-result";

declare module Renderer {
  function renderReport(lhr: AuditResult, options?: Options): HTMLElement;

  interface Options {
    /**
     * Don't automatically apply dark-mode to dark based on (prefers-color-scheme: dark). (DevTools and PSI don't want this.)
     * Also, the fireworks easter-egg will want to flip to dark, so this setting will also disable chance of fireworks. */
    disableAutoDarkModeAndFireworks?: boolean;

    /** Disable the topbar UI component */
    omitTopbar?: boolean;
    /** Prevent injection of report styles. Set to true if these styles are already included by the environment. */
    omitGlobalStyles?: boolean;
    /**
     * Convert report anchor links to a different format.
     * Flow report uses this to convert `#seo` to `#index=0&anchor=seo`.
     */
    onPageAnchorRendered?: (link: HTMLAnchorElement) => void;

    /** If defined, the 'Save as Gist' item in the topbar dropdown will be shown and when clicked, will run this function. */
    onSaveGist?: (lhr: LH.Result) => string;

    /** If defined, when the 'Save/Copy as HTML' items are clicked, this fn will be used instead of `documentElement.outerHTML`. */
    getStandaloneReportHTML?: () => string;

    /**
     * DOM element that will the overlay DOM should be a child of.
     * Between stacking contexts and z-index, the overlayParentEl should have a stacking/paint order high enough to cover all elements that the overlay should paint above.
     * Defaults to the containerEl, but will be set in PSI to avoid being under the sticky header.
     * @see https://philipwalton.com/articles/what-no-one-told-you-about-z-index/ */
    overlayParentEl?: HTMLElement;

    /** Callback running after a DOM element (like .lh-node or .lh-source-location) has been created */
    onDetailsItemRendered?: (
      type: LH.Audit.Details['type'],
      el: HTMLElement,
      value: LH.Audit.Details
    ) => void;
  }
}

export default Renderer;
