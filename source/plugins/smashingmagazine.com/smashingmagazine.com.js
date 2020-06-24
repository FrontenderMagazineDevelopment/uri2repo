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
    name: 'smashingmagazine.com',
    dependency: ['fetch', 'domain', 'getTags'],
    domain: 'smashingmagazine.com',
  },

  /**
   * Cleaning open-graph title
   */
  [['metadata:after']]: async (unmodified) => {
    const {
      meta: {
        name,
        domain,
      },
      dependencyCheck,
      domainCheck,
    } = module.exports;
    const {
      url,
      stack,
      dom: { original },
    } = unmodified;
    const modified = {
      openGraph: {},
      ...unmodified,
    };
    const {
      openGraph: {
        ogTitle,
        twitterTitle,
      },
    } = modified;
    try {
      if (!domainCheck(url, domain)) return unmodified;
      dependencyCheck(stack, ['open-graph'], name);

      const publisher = original.window.document.querySelector('meta[property="article:publisher"]').getAttribute('content');
      const author = original.window.document.querySelector('meta[property="article:author"]').getAttribute('content');
      const tag = original.window.document.querySelector('meta[property="article:tag"]').getAttribute('content');
      const section = original.window.document.querySelector('meta[property="article:section"]').getAttribute('content');
      const publishedTime = original.window.document.querySelector('meta[property="article:published_time"]').getAttribute('content');
      const modifiedTime = original.window.document.querySelector('meta[property="article:modified_time"]').getAttribute('content');
      const ogupdatedTime = original.window.document.querySelector('meta[property="og:updated_time"]').getAttribute('content');

      const openGraph = {
        article: {
          publisher,
          author,
          tag,
          section,
          publishedTime,
          modifiedTime,
        },
        ogupdatedTime,
      };

      modified.openGraph = {
        ...modified.openGraph,
        ...openGraph,
      };
      modified.openGraph.ogTitle = ogTitle.replace(' — Smashing Magazine', '');
      modified.openGraph.twitterTitle = twitterTitle.replace(' — Smashing Magazine', '');
      modified.stack.push(name);
      return modified;
    } catch (error) {
      return unmodified;
    }
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
    try {
      if (!domainCheck(url, domain)) return unmodified;
      dependencyCheck(stack, dependency, name);
      const extractedTags = [...original.window.document.querySelectorAll('.meta-box--tags a')].map((element) => element.innerHTML);
      modified.tags = [...extractedTags, domainName];
      page.author = original.window.document.querySelector('.bio-image-image').getAttribute('data-alt');
      modified.stack.push(name);
      return modified;
    } catch (error) {
      return unmodified;
    }
  },
});
