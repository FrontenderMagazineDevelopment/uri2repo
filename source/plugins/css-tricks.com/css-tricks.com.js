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
    name: 'css-tricks.com',
    dependency: ['createMarkdown', 'domain', 'getTags'],
    domain: 'css-tricks.com',
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
      dom: { original },
      mercury: [page],
    } = unmodified;
    const modified = {
      tags: [],
      stack: [],
      ...unmodified,
    };
    const {
      tags,
    } = modified;

    if (!domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);
    const tagsElements = original.window.document.querySelectorAll('.tags a');
    if (tagsElements) {
      const extractedTags = [...tagsElements].map((element) => element.innerHTML);
      modified.tags = [...extractedTags, domainName];
    } else {
      console.log('missing tags on: ', url);
    }
    const authorElement = original.window.document.querySelector('.author-name-area .author-name');
    if (authorElement !== null) {
      page.author = original.window.document.querySelector('.author-name-area .author-name').innerHTML;
    } else {
      console.log('missing author on: ', url);
    }
    modified.stack.push(name);
    return modified;
  },
});
