const fs = require('fs');
const path = require('path');
const shajs = require('sha.js');
const sharp = require('sharp');
const jsdom = require('jsdom');
const flatten = require('array-flatten');
const urlParser = require('url');
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
    name: 'downloadImages',
    dependency: ['mercury', 'domain', 'slug'],
  },

  /**
   * getURLSFromString - transform string from attributes src and srcset
   *
   * @param {string} url Description
   * @method
   *
   * @return {array} array with urls
   */
  getURLSFromString: (url) => {
    const ulrs = [];
    const parts = url.split(',');
    let index = parts.length;
    let acc = null;
    let part = null;

    // eslint-disable-next-line no-plusplus
    while (index--) {
      part = decodeURI(parts[index]).trim().replace(/(.*)[?\s]+.*/ig, '$1');
      const isPartURL = /(^\/)|(^\.\/)|(^\.\.\/)|(^http)/ig.test(part);
      const isAccURL = /(^\/)|(^\.\/)|(^\.\.\/)|(^http)/ig.test(acc);
      if (isAccURL && isPartURL) {
        ulrs.push(part, acc);
        acc = null;
      } else if (isAccURL && !isPartURL) {
        ulrs.push(acc);
        acc = part;
      } else if (!isAccURL && isPartURL) {
        if (typeof acc === 'string') {
          ulrs.push(`${part},${acc}`);
          acc = null;
        } else {
          ulrs.push(part);
        }
      } else if (!isAccURL && !isPartURL) {
        acc = (typeof acc === 'string') ? `${part},${acc}` : part;
      }
    }

    return ulrs;
  },


  /**
   * Download image and return filename
   * @param  {string}  uri     - image uri
   * @param  {string}  domain  - article domain
   * @return {Promise<string>} - filename
   */
  download: async (uri, domain, DIR) => {
    const isAbsolute = /(^\/\/:)|(^http)/ig.test(uri);
    const newUrl = isAbsolute ? uri : `${domain}${uri}`;
    const result = await fetch(newUrl, { method: 'GET' });
    const parsedSource = urlParser.parse(newUrl);

    const hex = shajs('sha256').update(newUrl).digest('hex');
    const name = `${decodeURI(parsedSource.pathname).replace(/(.*)[?\s]+.*/ig, '$1').split('/').pop()}`;

    // eslint-disable-next-line no-underscore-dangle
    const type = result.headers._headers['content-type'][0];
    const contentType = /([\w]+)\/([\s\w]+)(;[^$]*)?/ig;
    const matched = contentType.exec(type);
    if (matched[1] !== 'image') throw new Error('not an image');
    const resultName = `${hex}_${name.replace(/\.[a-z]+$/ig, '')}.${matched[2]}`;

    const fileStream = fs.createWriteStream(path.resolve(DIR, resultName));
    return new Promise((resolve) => {
      result.body.pipe(fileStream);
      fileStream.on('finish', async () => {
        const answer = {
          oldName: uri,
          newName: `images/${resultName}`,
        };
        if (matched[2] !== 'webp') {
          const resultNameWebp = `${hex}_${name.replace(/\.[a-z]+$/ig, '')}.webp`;
          await sharp(path.resolve(DIR, resultName))
            .webp()
            .toFile(path.resolve(DIR, resultNameWebp));
          answer.webpName = resultNameWebp;
        }

        resolve(answer);
      });
    });
  },

  /**
   * match mercury and fetch dom containers
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
      download,
      dependencyCheck,
      domainCheck,
      getURLSFromString,
    } = module.exports;
    const {
      url,
      base,
      stack,
      TMP_DIR_NAME,
      slug,
      TMP_IMAGE_DIR_NAME,
    } = unmodified;
    const modified = {
      dom: {},
      stack: [],
      ...unmodified,
    };
    let {
      dom: {
        mercury,
      },
    } = modified;

    if (domainCheck(url, domain)) return unmodified;
    dependencyCheck(stack, dependency);

    const linked = mercury.window.document.querySelectorAll('a img');
    const DIR = path.resolve(
      TMP_DIR_NAME,
      slug,
      TMP_IMAGE_DIR_NAME,
    );

    linked.forEach((img) => {
      const link = img.closest('a');
      link.before(img);
      link.remove();
    });

    const images = mercury.window.document.querySelectorAll('img, picture source');

    const downloadsList = Array.from(images).map((element) => {
      let src = element.getAttribute('src');
      let srcset = element.getAttribute('srcset');
      const downloads = [];

      if (
        (src !== null)
        && (srcset !== null)
      ) {
        src = decodeURI(src).replace(/[\s]+/ig, ' ').trim();
        srcset = decodeURI(srcset).replace(/[\s]+/ig, ' ').trim();

        if (src === srcset) {
          const img = mercury.window.document.querySelector(`img[src][srcset*="${decodeURI(element.getAttribute('src')).split(',')[0]}"]`);

          if (img !== null) {
            element.setAttribute('src', img.getAttribute('src'));
          }
        }
      }

      if (src !== null) {
        const urls = [...new Set(getURLSFromString(src))];
        downloads.push(urls);
      }
      if (srcset !== null) {
        const urls = [...new Set(getURLSFromString(srcset))];
        downloads.push(urls);
      }

      return downloads;
    });

    const list = [...new Set(flatten(downloadsList))];
    const downloads = list.map(async uri => download(uri, base, DIR));
    const names = await Promise.all(downloads);

    let html = mercury.window.document.documentElement.outerHTML;
    names.forEach(({ oldName, newName }) => {
      html = html.replace(new RegExp(oldName, 'g'), newName);
    });
    const { JSDOM } = jsdom;
    mercury = new JSDOM(html);

    modified.stack.push(name);
    return modified;
  },
});
