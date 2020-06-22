const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { flatten } = require('array-flatten');

dotenv.config();

// eslint-disable-next-line no-unused-vars
const logger = (name) => {
  console.log(name);
  return name;
};

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
      if (path.extname(fileURI) !== '.js') return plugins;
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
    let plugins = this.pluginCollector(path.resolve(__dirname, './plugins'));
    // eslint-disable-next-line import/no-dynamic-require, global-require
    plugins = plugins.map((uri) => (require(uri)));

    return flatten(this.stages
      // remove stages we should skip
      .filter((stage) => (!this.skip.stages.includes(stage)))
      // map stages to plugins array
      .map((stage) => plugins
      // filter plugin that have no functions for this stage
        .filter((plugin) => ((plugin[stage] !== undefined) && (typeof plugin[stage] === 'function')))
      // filter plugin we need to skip
        .filter((plugin) => {
          const { meta: { name } } = plugin;
          return (this.skip.plugins.find(
            (skippedPlugin) => (
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
        // .map(logger)
      // map plugins to functions
        .map((plugin) => (plugin[stage]))))
      .reduce(async (state, plugin) => {
        const resolvedState = await state;
        return plugin(resolvedState);
      }, article);
  }
}

module.exports = ArticleBuilder;

// (async () => {
//   const builder = new ArticleBuilder();
//   builder.skip.stages = [
//     'github:before',
//     'github',
//     'github:after',
//   ];
//   builder.skip.plugins = [
//     { name: 'codepenTransform' },
//     { name: 'codepenTransformIFrame' },
//     { name: 'createREADME' },
//     { name: 'downloadImages' },
//     { name: 'writeMarkdown' },
//     { name: 'TMPDir' },
//     { name: 'initGithub' },
//     { name: 'uploadToRepo' },
//     { name: 'createRepo' },
//     { name: 'createREADME' },
//     { name: 'createCard' },
//   ];
//   try {
//     const result = await builder.create('https://increment.com/frontend/a-users-guide-to-css-variables/');
//     console.log(result.schema);
//     // console.log(result.tags);
//     // console.log(result.mercury[0].author);
//     // console.log(result.openGraph);
//   } catch (error) {
//     console.log(error);
//   }
// })();
