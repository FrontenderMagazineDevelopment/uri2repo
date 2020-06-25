const DetectLanguage = require('detectlanguage');
const deepmerge = require('deepmerge');
const striptags = require('striptags');
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
    name: 'detectLanguage',
    dependency: ['mercury'],
  },

  /**
   * match mercury and fetch dom containers
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  metadata: async (unmodified) => {
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
      html: {
        mercury,
      },
    } = modified;
    if (!domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);

    try {
      const detectLanguage = new DetectLanguage({
        key: process.env.DETECTLANGUAGE_KEY,
      });

      const language = await new Promise((resolve, reject) => {
        detectLanguage.detect(striptags(mercury), (error, result) => {
          if (error) reject(error);
          resolve(result);
        });
      });

      modified.language = language;
      modified.stack.push(name);
      return modified;
    } catch (error) {
      console.log(error);
      return unmodified;
    }
  },
});
