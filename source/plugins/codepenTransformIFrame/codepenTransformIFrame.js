const urlParser = require('url');
const deepmerge = require('deepmerge');
const pluginBase = require('../../libs/PluginBase');
const CodepenCravler = require('../../libs/CodepenCravler');

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
    name: 'codepenTransformIFrame',
    dependency: ['mercury'],
  },

  /**
   * Get data from codepen as iframe
   * @param  {[type]} uri [description]
   * @return {[type]}     [description]
   */
  getDataIframe: (uri) => {
    const parsed = urlParser.parse(uri, true, true);
    const matched = parsed.pathname.match(/\/([^/]+)\/embed\/([^/]+)(\/)?/i);
    const user = matched[1];
    const slug = matched[2];
    const data = {
      ...parsed.query,
      user,
      'slug-hash': slug,
    };
    return data;
  },

  /**
   * clone codepen to FMRobotAccount
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  mutation: async (unmodified) => {
    const {
      meta: {
        name,
        dependency,
        domain,
      },
      getDataIframe,
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
    const {
      dom: {
        mercury,
      },
    } = modified;
    if (!domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);
    modified.stack.push(name);

    const elements = mercury.window.document.querySelectorAll("iframe[src*='//codepen.io/']");
    const dataList = [];
    const pens = [];

    if (elements.length === 0) return modified;

    Array.prototype.slice.call(elements).forEach((element) => {
      const data = getDataIframe(element.getAttribute('src'));
      dataList.push(data);
      pens.push(`https://codepen.io/${data.user}/pen/${data['slug-hash']}/`);
    });

    const forks = await new CodepenCravler({
      login: process.env.GITHUB_LOGIN,
      passw: process.env.GITHUB_PASSW,
      pens,
    });

    for (let i = 0; i < forks.length; i += 1) {
      const fork = forks[i];
      const data = dataList[i];
      const nodes = Array.from(elements);
      const parsed = urlParser.parse(fork, true, true);
      Array.prototype.slice.call(data).forEach((attribute) => {
        nodes[i].setAttribute(`data-${attribute}`, data[attribute]);
      });
      nodes[i].setAttribute('data-user', 'FMRobot');
      nodes[i].setAttribute('data-slug-hash', parsed.pathname.split('/').pop());
    }

    return modified;
  },
});
