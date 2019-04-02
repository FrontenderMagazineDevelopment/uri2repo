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
    name: 'codepenTransform',
    dependency: ['mercury'],
  },

  /**
   * Get data from codepen as block
   * @param  {node} node node from which you want to get params
   * @return {object} object containing attributes
   */
  getData: (node) => {
    const data = {};
    if (node.getAttribute('data-theme-id')) data['theme-id'] = node.getAttribute('data-theme-id');
    if (node.getAttribute('data-slug-hash')) data['slug-hash'] = node.getAttribute('data-slug-hash');
    if (node.getAttribute('data-default-tab')) data['default-tab'] = node.getAttribute('data-default-tab');
    if (node.getAttribute('data-user')) data.user = node.getAttribute('data-user');
    if (node.getAttribute('data-embed-version')) data['embed-version'] = node.getAttribute('data-embed-version');
    if (node.getAttribute('data-pen-title')) data['pen-title'] = node.getAttribute('data-pen-title');
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
      getData,
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
    if (domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency, name);
    modified.stack.push(name);

    const elements = mercury.window.document.querySelectorAll('p.codepen');
    const pens = [];

    if (elements.length === 0) return modified;

    Array.prototype.slice.call(elements).forEach((element) => {
      const data = getData(element);
      pens.push(`https://codepen.io/${data.user}/pen/${data['slug-hash']}/`);
    });

    const forks = await new CodepenCravler({
      login: process.env.GITHUB_LOGIN,
      passw: process.env.GITHUB_PASSW,
      pens,
    });

    for (let i = 0; i < forks.length; i += 1) {
      const fork = forks[i];
      const nodes = Array.from(elements);
      const parsed = urlParser.parse(fork, true, true);
      nodes[i].setAttribute('data-user', 'FMRobot');
      nodes[i].setAttribute('data-slug-hash', parsed.pathname.split('/').pop());
    }

    return modified;
  },
});
