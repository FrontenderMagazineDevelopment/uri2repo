const deepmerge = require('deepmerge');
const pluginBase = require('../../libs/PluginBase');
const articleSchema = require('../../libs/ArticleSchema');

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
    name: 'schema',
    dependency: ['fetch'],
  },

  /**
   * generate slug
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  metadata: (unmodified) => {
    const {
      meta: {
        name,
        dependency,
        domain,
      },
      dependencyCheck,
      domainCheck,
    } = module.exports;
    const modified = {
      schema: null,
      stack: [],
      ...unmodified,
    };
    try {
      if (!domainCheck(unmodified.url, domain)) return unmodified;
      dependencyCheck(unmodified.stack, dependency, name);
      const {
        dom: { original },
      } = unmodified;
      modified.stack.push(name);
      modified.schema = articleSchema(original);
      return modified;
    } catch (error) {
      return unmodified;
    }
  },
});
