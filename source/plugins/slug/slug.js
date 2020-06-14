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
    name: 'slug',
    // dependency: ['mercury'],
  },

  /**
   * generate slug
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
    const modified = {
      slug: null,
      stack: [],
      ...unmodified,
    };
    if (!domainCheck(unmodified.url, domain)) return unmodified;
    dependencyCheck(unmodified.stack, dependency, name);
    const {
      slug,
      url,
      // mercury: [{
      //   title,
      // }],
    } = unmodified;
    modified.stack.push(name);
    if (slug !== null) {
      modified.slug = slug;
      return modified;
    }
    const parsed = path.parse(url);
    const isHRU = !(parsed.base.indexOf('.') > -1);
    const splitetURL = parsed.dir.split(/[\\/]/ig);
    let nameSlug;
    if (isHRU || splitetURL.length < 2) {
      nameSlug = parsed.name;
    } else {
      nameSlug = splitetURL.pop();
    }
    modified.slug = nameSlug;
    return modified;
    // @todo define when url copy is bad idea and we may use title
    // const titleSlug = title.toLowerCase().replace(/[?!;.,']+/ig, '')
    //   .replace(/[^a-z]+/ig, '-').trim();
    // if (titleSlug.length > 0) {
    //   modified.slug = titleSlug;
    //   return modified;
    // }
  },
});
