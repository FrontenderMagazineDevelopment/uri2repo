// const path = require('path');
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
    name: 'domain',
  },

  /**
   * before - function get domain and base url
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  before: (unmodified) => {
    const {
      meta: {
        name,
        dependency,
        domain: targetDomain,
      },
      dependencyCheck,
      domainCheck,
    } = module.exports;
    const modified = {
      domain: null,
      stack: [],
      ...unmodified,
    };
    if (!domainCheck(unmodified.url, targetDomain)) return unmodified;
    dependencyCheck(unmodified.stack, dependency, name);
    // const parsed = path.parse(unmodified.url);
    // if (parsed.ext !== '') {
    //   modified.base = parsed.dir.replace(/([^/\\])$/ig, `$1${path.sep}`);
    // } else {
    //   modified.base = unmodified.url.replace(/([^/\\])$/ig, `$1${path.sep}`);
    // }
    // [, modified.domain] = /https?:\/\/([^/\\]+)/ig.exec(unmodified.url);
    const url = new URL(unmodified.url);
    modified.domain = url.origin.replace(`${url.protocol}//`, '').replace(/^www./ig, '');
    modified.stack.push(name);
    return modified;
  },
});
