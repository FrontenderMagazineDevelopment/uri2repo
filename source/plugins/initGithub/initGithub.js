const deepmerge = require('deepmerge');
const pluginBase = require('../../libs/PluginBase');
const GitHubUtils = require('../../libs/GitHubUtils');

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
    name: 'initGithub',
  },

  /**
   * create README.md file
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  [['github:before']]: (unmodified) => {
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
    try {
      if (!domainCheck(url, domain)) return unmodified;
      dependencyCheck(stack, dependency, name);
      modified.gitHubUtils = new GitHubUtils();
      modified.stack.push(name);
      return modified;
    } catch (error) {
      console.log(error);
      return unmodified;
    }
  },
});
