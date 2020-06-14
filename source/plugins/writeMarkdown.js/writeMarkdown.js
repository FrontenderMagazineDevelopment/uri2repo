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
    name: 'writeMarkdown',
    dependency: ['createMarkdown', 'slug'],
  },

  /**
   * match mercury and fetch dom containers
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  [['mutation:after']]: (unmodified) => {
    const {
      meta: {
        name,
        dependency,
      },
      dependencyCheck,
    } = module.exports;
    const {
      stack,
      slug,
      TMP_DIR_NAME,
    } = unmodified;
    const modified = {
      stack: [],
      ...unmodified,
    };
    const {
      markdown,
    } = modified;
    dependencyCheck(stack, dependency, name);

    fs.writeFileSync(path.resolve(
      TMP_DIR_NAME,
      slug,
      'eng.md',
    ), markdown);

    fs.writeFileSync(path.resolve(
      TMP_DIR_NAME,
      slug,
      'rus.md',
    ), markdown);

    modified.stack.push(name);
    return modified;
  },
});
