const jsdom = require('jsdom');
const deepmerge = require('deepmerge');
const fetch = require('isomorphic-fetch');
const pluginBase = require('../../libs/PluginBase');

/**
 * @typedef {object} PluginMeta
 * @property {string} name - plugin name
 * @property {string[]} dependency - array of plugins that we need to run first
 * @property {string} stage - stage on which we should run plugin
 * @property {boolean} async - function return Promise?
 */

/**
 * @namespace
 * @typedef {object} Plugin
 * @property {PluginMeta} meta - plugins mata data
 * @property {function} create - plugin function
 */
module.exports = deepmerge(pluginBase, {
  meta: {
    name: 'fetch',
  },
  /**
   * task - function that get html source of article
   * @async
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  resource: async (unmodified) => {
    const modified = {
      html: {},
      dom: {},
      stack: [],
      ...unmodified,
    };
    const {
      meta: {
        name,
        dependency,
        domain,
      },
      domainCheck,
      dependencyCheck,
    } = module.exports;
    if (domainCheck(unmodified.url, domain)) return unmodified;
    dependencyCheck(unmodified.stack, dependency, name);
    const response = await fetch(unmodified.url);
    if (!response.ok) throw new Error(`${name}: can't fetch resource.`);
    const { JSDOM } = jsdom;
    modified.html.original = await response.text();
    modified.dom.original = new JSDOM(modified.html.original);
    modified.stack.push(name);
    return modified;
  },
});
