const deepmerge = require('deepmerge');
const ogs = require('open-graph-scraper');
const pluginBase = require('../../libs/PluginBase');

const getOpenGraph = (html) => new Promise((resolve, reject) => ogs({ html }, (error, results) => {
  if (error) reject(results);
  resolve(results.data);
}));

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
    name: 'open-graph',
    dependency: ['fetch'],
  },

  /**
   * Aquire open-graph data
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  [['metadata']]: async (unmodified) => {
    const {
      meta: {
        name,
        dependency,
      },
      dependencyCheck,
    } = module.exports;
    const {
      stack,
      html,
      dom: { original },
    } = unmodified;
    const modified = {
      openGraph: {},
      ...unmodified,
    };

    try {
      dependencyCheck(stack, dependency, name);

      const article = ['publisher', 'author', 'tag', 'section', 'published_time', 'modified_time'];
      const book = ['author', 'isbn', 'release_date', 'tag'];
      const profile = ['first_name', 'last_name', 'username', 'gender'];
      const noVertical = {
        article,
        book,
        profile,
      };

      const extended = Object.entries(noVertical).reduce((collector, [propertyName, list]) => {
        const noVerticalInstance = list.reduce((block, content) => {
          const element = original.window.document.querySelector(`meta[property="${propertyName}:${content}"]`);
          if (element === null) return block;
          return {
            [[content]]: element.getAttribute('content'),
            ...block,
          };
        }, {});
        if (Object.keys(noVerticalInstance).length === 0) return collector;
        return { ...collector, [[propertyName]]: noVerticalInstance };
      }, {});

      let openGraph = { ...extended };

      const ogupdatedTimeElement = original.window.document.querySelector('meta[property="og:updated_time"]');
      if (ogupdatedTimeElement !== null) {
        const ogUpdatedTime = ogupdatedTimeElement.getAttribute('content');
        if (ogUpdatedTime) {
          openGraph = {
            ...openGraph,
            ogUpdatedTime,
          };
        }
      }

      const data = await getOpenGraph(html.original);
      openGraph = {
        ...openGraph,
        ...data,
      };

      modified.openGraph = {
        ...modified.openGraph,
        ...openGraph,
      };
      modified.stack.push(name);
      return modified;
    } catch (error) {
      return unmodified;
    }
  },
});
