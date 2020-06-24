const deepmerge = require('deepmerge');
const pluginBase = require('../../libs/PluginBase');
const TagExtractor = require('../../libs/TagExtractor');

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
    name: 'getTags',
    dependency: ['createMarkdown', 'domain'],
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
      markdown,
    } = unmodified;
    const modified = {
      tags: [],
      stack: [],
      ...unmodified,
    };
    const {
      tags,
    } = modified;
    try {
      if (!domainCheck(url, domain)) return unmodified;
      dependencyCheck(stack, dependency, name);
      const extractedTags = await new TagExtractor(markdown);
      modified.tags = [...tags, domainName, ...extractedTags];
      modified.stack.push(name);
      return modified;
    } catch (error) {
      return unmodified;
    }
  },
});
