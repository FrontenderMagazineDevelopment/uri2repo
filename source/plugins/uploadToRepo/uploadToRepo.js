const path = require('path');
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
    name: 'uploadToRepo',
    dependency: ['createRepo', 'TMPDir:before'],
  },

  /**
   * upload all files from tmp dir to repo
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  github: async (unmodified) => {
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
      slug,
      TMP_DIR_NAME,
      gitHubUtils,
    } = unmodified;
    const modified = {
      dom: {},
      stack: [],
      ...unmodified,
    };
    try {
      if (!domainCheck(url, domain)) return unmodified;
      dependencyCheck(stack, dependency, name);
      const articleDIR = path.resolve(TMP_DIR_NAME, slug);
      await gitHubUtils.uploadDir(articleDIR);
      modified.stack.push(name);
      return modified;
    } catch (error) {
      console.log(error);
      return unmodified;
    }
  },
});
