/* eslint-disable class-methods-use-this */
require('@babel/polyfill');
require('dotenv').config({ path: '../.env' });
const path = require('path');
const fs = require('fs');
const flatten = require('array-flatten');

/**
 * ArticleBuilder
 * @class
 * @namespace
 */
class ArticleBuilder {
  /**
   * constructor creates tmp directory if it not created yet
   * @constructor
   */
  constructor() {
    ArticleBuilder.TMP_DIR_NAME = './tmp';
    ArticleBuilder.TMP_IMAGE_DIR_NAME = './images';
    this.stages = [
      'before',
      'resource:before',
      'resource',
      'resource:after',
      'metadata:before',
      'metadata',
      'metadata:after',
      'mutation:before',
      'mutation',
      'mutation:after',
      'github:before',
      'github',
      'github:after',
      'after',
    ];
    this.skip = {
      plugins: [
        // 'TMPDir',
      ],
      stages: [
        'github:before',
        'github',
        'github:after',
      ],
    };
  }

  pluginCollector(uri, plugins = []) {
    const files = fs.readdirSync(uri, { withFileTypes: true });
    return flatten(files.map((file) => {
      const fileURI = path.resolve(uri, file.name);
      if (file.isDirectory()) {
        return this.pluginCollector(fileURI);
      }
      plugins.push(fileURI);
      return plugins;
    }));
  }

  async create(url, slug = null) {
    const article = {
      url,
      slug,
      assignees: ['silentimp'],
      TMP_DIR_NAME: ArticleBuilder.TMP_DIR_NAME,
      TMP_IMAGE_DIR_NAME: ArticleBuilder.TMP_IMAGE_DIR_NAME,
    };
    let plugins = this.pluginCollector(path.resolve('./source/plugins'));
    // eslint-disable-next-line import/no-dynamic-require, global-require
    plugins = plugins.map(uri => (require(uri)));

    const result = await flatten(this.stages
      .filter(stage => (!this.skip.stages.includes(stage)))
      .filter(stage => (plugins
        .filter(plugin => (
          (plugin[stage] !== undefined)
          && (typeof plugin[stage] === 'function'))).length > 0))
      .map(stage => (
        plugins
          .filter(plugin => (
            (plugin[stage] !== undefined)
            && (typeof plugin[stage] === 'function')))
          .sort((pluginA, pluginB) => (pluginA.meta.dependency.includes(pluginB.meta.name) ? 1 : 0))
          .map(plugin => (plugin[stage]))
      )))
      .filter(plugin => (!this.skip.plugins.includes(plugin)))
      .reduce(async (state, plugin) => {
        const resolvedState = await state;
        return plugin(resolvedState);
      }, article);

    console.log(result);
  }
}

(async () => {
  try {
    const builder = new ArticleBuilder();
    await builder.create('https://daveceddia.com/intro-to-hooks/');
  } catch (error) {
    console.log(error);
  }
})();
