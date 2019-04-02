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
    name: 'restoreImages',
    dependency: ['matchContainer', 'mercury', 'fetch'],
  },

  /**
   * match mercury and fetch dom containers
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  [['mutation:before']]: (unmodified) => {
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
    } = unmodified;
    const modified = {
      dom: {},
      stack: [],
      ...unmodified,
    };
    const {
      dom: {
        mercury,
        matched,
      },
    } = modified;
    if (domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);
    modified.stack.push(name);
    if (!matched) return unmodified;
    const mercuryCodeBlocks = mercury.window.document.querySelectorAll('img');
    const originalCodeBlocks = matched.querySelectorAll('img');
    mercuryCodeBlocks.forEach((block, index) => {
      block.replaceWith(originalCodeBlocks[index]);
    });
    return modified;
  },
});
