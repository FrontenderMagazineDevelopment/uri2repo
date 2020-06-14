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
    name: 'cleanDisqus',
    dependency: ['mercury'],
  },

  /**
   * match mercury and fetch dom containers
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  mutation: (unmodified) => {
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
      },
    } = modified;
    if (!domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);

    Array.from(mercury.window.document.querySelectorAll('[class*="disqus"],[class*="dsq-"],[id*="disqus"]'))
      .forEach((node) => {
        if (node) node.parentNode.removeChild(node);
      });

    modified.stack.push(name);
    return modified;
  },
});
