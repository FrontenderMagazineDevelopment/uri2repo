const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { flatten } = require('array-flatten');

// console.log(flatten);

// process.exit(0);

dotenv.config();

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
      plugins: [],
      stages: [],
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

    await flatten(this.stages
      // remove stages we should skip
      .filter(stage => (!this.skip.stages.includes(stage)))
      // map stages to plugins array
      .map(stage => plugins
      // filter plugin that have no functions for this stage
        .filter(plugin => ((plugin[stage] !== undefined) && (typeof plugin[stage] === 'function')))
      // filter plugin we need to skip
        .filter((plugin) => {
          const { meta: { name } } = plugin;
          return (this.skip.plugins.find(
            skippedPlugin => (
              (
                skippedPlugin.name === name
                  && skippedPlugin.stages === undefined
              ) || (
                skippedPlugin.name === name
                  && Array.isArray(skippedPlugin.stages)
                  && skippedPlugin.stages.includes(stage)
              ) || (
                skippedPlugin.name === name
                  && !Array.isArray(skippedPlugin.stages)
                  && skippedPlugin.stages === stage
              )
            ),
          ) === undefined);
        })
      // sort plugins by dependency
        .sort((pluginA, pluginB) => (
          pluginA.meta.dependency.includes(pluginB.meta.name)
            ? 1 : -1))
      // map plugins to functions
        .map(plugin => (plugin[stage]))))
      .reduce(async (state, plugin) => {
        const resolvedState = await state;
        return plugin(resolvedState);
      }, article);
  }
}

// (async () => {
//   try {
//     const builder = new ArticleBuilder();
//     await builder.create('https://www.smashingmagazine.com/2020/05/convince-others-against-dark-patterns/');
//   } catch (error) {
//     console.log(error);
//   }
// })();
