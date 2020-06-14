const deepmerge = require('deepmerge');
const pluginBase = require('../../libs/PluginBase');

/**
 * @typedef {object} PluginMeta
 * @property {string} name - plugin name
 * @property {string[]} dependency - array of plugins that we need to run first
 * @property {boolean} async - function return Promise?
 */

/**
 * @namespace
 * @typedef {object} Plugin
 * @property {PluginMeta} meta - plugins mata data
 * @property {function} before - plugin function
 */
module.exports = deepmerge(pluginBase, {
  meta: {
    name: 'dev.to',
    dependency: ['createMarkdown', 'domain', 'getTags'],
    domain: 'dev.to',
  },

  /**
   * create README.md file
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  [['mutation:after']]: async (unmodified) => {
    const {
      meta: {
        name,
        dependency,
        domain,
      },
      dependencyCheck,
      domainCheck,
    } = module.exports;
    const {
      url,
      stack,
      domain: domainName,
      dom: { original },
    } = unmodified;
    const modified = {
      tags: [],
      stack: [],
      ...unmodified,
    };

    if (!domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);

    const extractedTags = [...original.window.document.querySelectorAll('.tags .tag')].map((element) => element.innerHTML).map((element) => element.slice(1));

    modified.tags = [...extractedTags, domainName];
    modified.stack.push(name);
    return modified;
  },
});
