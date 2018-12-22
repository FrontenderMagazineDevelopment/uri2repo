/* eslint-disable no-unreachable */
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
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
    name: 'TMPDir',
    dependency: ['domain', 'slug'],
  },

  /**
   * remove tmp folder
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  after: (unmodified) => {
    return unmodified;
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
      TMP_DIR_NAME,
      slug,
    } = unmodified;

    const modified = {
      stack: [],
      ...unmodified,
    };
    if (domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, [...dependency, `${name}:before`]);
    const articleDIR = path.resolve(TMP_DIR_NAME, slug);
    rimraf.sync(articleDIR);
    modified.stack.push(`${name}:after`);
    return modified;
  },

  /**
   * create tmp folder
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  before: (unmodified) => {
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
      TMP_DIR_NAME,
      slug,
      TMP_IMAGE_DIR_NAME,
    } = unmodified;

    const modified = {
      stack: [],
      ...unmodified,
    };

    if (domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency);

    const articleDIR = path.resolve(TMP_DIR_NAME, slug);
    const articleImagesDIR = path.resolve(articleDIR, TMP_IMAGE_DIR_NAME);
    if (!fs.existsSync(TMP_DIR_NAME)) fs.mkdirSync(TMP_DIR_NAME);
    if (!fs.existsSync(articleDIR)) fs.mkdirSync(articleDIR);
    if (!fs.existsSync(articleImagesDIR)) fs.mkdirSync(articleImagesDIR);

    modified.stack.push(`${name}:before`);
    return modified;
  },
});
