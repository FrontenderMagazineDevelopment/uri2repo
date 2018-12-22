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
    name: 'matchContainer',
    dependency: ['mercury', 'fetch'],
  },

  /**
   * @method getNodeSelector
   * @param {node} element to build selector from
   * @return {string} css selector builded from id, class and atributes
   */
  getNodeSelector: (element) => {
    if (element === null) throw new Error('element should be provided');
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute('id');
    const classname = element.getAttribute('class').split(' ').join('.');
    let attributesSelector = '';
    const skipAttr = ['class', 'id'];
    for (let i = element.attributes.length - 1; i >= 0; i -= 1) {
      if (!skipAttr.includes(element.attributes[i].name)) attributesSelector += `[${element.attributes[i].name}="${element.attributes[i].value}"]`;
    }
    return `${tag}${id ? `#${id}` : ''}${classname ? `.${classname}` : ''}${attributesSelector || ''}`;
  },

  /**
   * match mercury and fetch dom containers
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  resource: (unmodified) => {
    const {
      meta: {
        name,
        dependency,
        domain,
      },
      getNodeSelector,
      dependencyCheck,
      domainCheck,
    } = module.exports;
    const {
      url,
      stack,
      dom: {
        mercury,
        original,
      },
    } = unmodified;
    const modified = {
      dom: {},
      stack: [],
      ...unmodified,
    };
    if (domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency);

    const element = mercury.window.document.querySelector('body').firstChild;
    const selector = getNodeSelector(element);
    let container = original.window.document.querySelectorAll(selector);
    if (container.length === 1) {
      [modified.dom.matched] = container;
    } else if (container.length > 0) {
      container = Array.from(container);
      const selectors = Array.from(element.childNodes)
        .filter(node => (node.nodeType === 1))
        .map(getNodeSelector);
      container.filter(node => (
        Array.from(node.childNodes)
          .filter(child => (child.nodeType !== Node.TEXT_NODE))
          .find(
            kid => (!selectors.include(getNodeSelector(kid))),
          ) === undefined));
      if (container.length === 1) {
        [modified.dom.matched] = container;
      }
    }
    modified.stack.push(name);
    return modified;
  },
});
