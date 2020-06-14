/**
 * @typedef {object} PluginMeta
 * @property {string} name - plugin name
 * @property {string | null} domain - domain plugin applyed to
 * @property {string[]} dependency - array of plugins that we need to run first
 */

/**
 * @namespace
 * @typedef {object} Plugin
 * @property {PluginMeta} meta - plugins mata data
 * @property {function} dependencyCheck - check if dependencies are met
 */
module.exports = {
  meta: {
    name: null,
    domain: null,
    dependency: [],
  },

  /**
   * dependencyCheck - if some dependencies not met throw error
   * @param {string[]} stack - list of plugins registred before
   * @param {string[]} dependency - list of dependencies for this plugin
   * @throw {Error} - if some dependencies not met
   */
  dependencyCheck: (stack = [], dependency = [], name = null) => {
    const error = dependency.find((plugin) => (!stack.includes(plugin)));
    if (error !== undefined) throw new Error(`Dependencies ${name ? `of ${name}` : ''} not met: ${error}`);
  },

  /**
   * domainCheck - check if this corresponding domain
   * @param {string} url - current url
   * @param {string} domain - target domain for this plugin
   */
  domainCheck: (url, domain) => {
    const currentDomain = /https?:\/\/(?<domain>[^/\\]+)/ig.exec(url);
    return (domain === null) || (currentDomain && (currentDomain[1].includes(domain)));
  },
};
