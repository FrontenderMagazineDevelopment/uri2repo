const fs = require('fs');
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
    name: 'createREADME',
    dependency: ['mercury', 'slug'],
  },

  /**
   * create README.md file
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
      slug,
      TMP_DIR_NAME,
    } = unmodified;
    const modified = {
      dom: {},
      stack: [],
      ...unmodified,
    };
    const {
      mercury: [{
        excerpt,
      }],
    } = modified;
    if (!domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);

    fs.writeFileSync(path.resolve(
      TMP_DIR_NAME,
      slug,
      'README.md',
    ), excerpt);

    modified.stack.push(name);
    return modified;
  },
});
