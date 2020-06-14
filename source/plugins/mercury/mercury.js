const jsdom = require('jsdom');
const Mercury = require('@frontender-magazine/mercury-sdk').default;
const deepmerge = require('deepmerge');
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
    name: 'mercury',
  },
  /**
   * resource - function that get mercury source of article
   * @async
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  resource: async (unmodified) => {
    const modified = {
      mercury: null,
      html: {},
      dom: {},
      stack: [],
      ...unmodified,
    };
    const {
      meta: {
        name,
        domain,
        dependency,
      },
      domainCheck,
      dependencyCheck,
    } = module.exports;
    if (!domainCheck(unmodified.url, domain)) return unmodified;
    dependencyCheck(unmodified.stack, dependency, name);
    const { JSDOM } = jsdom;
    const parser = new Mercury();
    modified.mercury = await parser.getAll(unmodified.url);
    modified.html.mercury = modified.mercury
      .map((page) => (page.content))
      .reduce((accumulator, page) => (`${accumulator}${page}`));
    modified.dom.mercury = new JSDOM(modified.html.mercury);
    modified.stack.push(name);
    return modified;
  },
});
