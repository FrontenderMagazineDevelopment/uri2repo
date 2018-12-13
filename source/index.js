import '@babel/polyfill';
import TurndownService from 'turndown';
import query from 'query-string';
import Mercury from '@frontender-magazine/mercury-sdk';
import shajs from 'sha.js';
import sharp from 'sharp';
import rimraf from 'rimraf';
import Algorithmia from 'algorithmia';

import jsdom from 'jsdom';
import urlParser from 'url';
import path from 'path';
import fs from 'fs';
import flatten from 'array-flatten';

// import pager from './__mock__/page.js';
import CodepenCravler from './libs/CodepenCravler';
import GitHubUtils from './libs/GitHubUtils';

const { JSDOM } = jsdom;
const prettier = require('prettier');

require('dotenv').config({ path: '../.env' });
const turndownPluginGfm = require('turndown-plugin-gfm');

/**
 * ArticleBuilder
 * @class
 * @namespace
 */
export default class ArticleBuilder {
  static TMP_DIR_NAME = './tmp';

  static TMP_IMAGE_DIR_NAME = './images';

  /**
   * constructor creates tmp directory if it not created yet
   * @constructor
   */
  constructor() {
    if (!fs.existsSync(ArticleBuilder.TMP_DIR_NAME)) fs.mkdirSync(ArticleBuilder.TMP_DIR_NAME);
  }

  /**
   * Get article from mercury service
   * @param  {string}  url - url of page
   * @return {Promise<string>} - markdown
   */
  getArticle = async (url) => {
    const parser = new Mercury(process.env.MERCURY_KEY);
    return parser.getAll(url);
  }


  /**
   * getArticleDOM - get article DOM
   *
   * @param {string} url - article url
   *
   * @return {DOM} article DOM
   */
  async getArticleDOM(url) {
    const response = await fetch(url);
    this.html = await response.text();
    const dom = new JSDOM(this.html);

    return dom;
  }

  /**
   * prettifyWithFirstThatWork - Just interate thru parsers until one of them work
   *
   * @param {string} code - string with code snippet
   *
   * @return {string} - string with prettified or unchanged code snippet
   */
  prettifyWithFirstThatWork = (code) => {
    const parsersList = [
      'typescript',
      'flow',
      'babylon',
      'less',
      'scss',
      'css',
      'json5',
      'json',
      'graphql',
      'mdx',
      'angular',
      'vue',
      'html',
      'yaml',
      'markdown',
    ].reverse(); // @todo reorder array and remove reverse

    let index = parsersList.length;
    let cleaned = code;

    // eslint-disable-next-line no-plusplus
    while (index--) {
      try {
        cleaned = prettier.format(code, {
          parser: parsersList[index],
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
        });
        break;
      // eslint-disable-next-line no-empty
      } catch (error) {}
    }

    return cleaned;
  }

  /**
   * convertToMD - convert to markdown
   * @param  {[type]} page [description]
   * @return {[type]}      [description]
   */
  convertToMD(page) {
    const turndownService = new TurndownService({
      codeBlockStyle: 'fenced',
      fence: '~~~',
      linkStyle: 'referenced',
    });
    turndownService.keep(['picture']);
    turndownService.remove([
      'form',
      'style',
      'script',
      'fieldset',
      'noscript',
      'legend',
      'input',
      'button',
      'textarea',
    ]);

    // code
    // turndownService.addRule('fencedCodeBlock', {
    //   filter(node, options) {
    //     return (
    //       options.codeBlockStyle === 'fenced'
    //       && node.nodeName === 'PRE'
    //       && node.firstChild
    //       && node.firstChild.nodeName === 'CODE'
    //     );
    //   },
    //   replacement: (content, node, options) => {
    //     const className = node.firstChild.className || '';
    //     const language = (className.match(/language-(\S+)/) || [null, ''])[1];
    //     const parsers = {
    //       typescript: 'typescript',
    //       flow: 'flow',
    //       javascript: 'babylon',
    //       less: 'less',
    //       scss: 'scss',
    //       css: 'css',
    //       json: 'json',
    //       markdown: 'markdown',
    //       html: 'html',
    //       yaml: 'yaml',
    //     };
    //     let code = node.firstChild.textContent;
    //     if (parsers[language] === undefined) {
    //       code = this.prettifyWithFirstThatWork(code);
    //     } else {
    //       try {
    //         code = prettier.format(code, {
    //           parser: parsers[language],
    //           printWidth: 80,
    //           tabWidth: 2,
    //           useTabs: false,
    //         });
    //       } catch (error) {
    //         code = this.prettifyWithFirstThatWork(code);
    //       }
    //     }
    //     return `
    //     ${options.fence}${language}
    //     ${code}
    //     ${options.fence}
    //     `;
    //   },
    // });

    // iframe
    turndownService.addRule('iframe', {
      filter(node) {
        return ((node.nodeName === 'IFRAME')
          && (node.getAttribute('src').indexOf('//codepen.io/') === -1));
      },
      replacement: (content, node) => node.outerHTML,
    });

    // adaptive images
    turndownService.addRule('img', {
      filter(node) {
        return (node.nodeName === 'IMG');
      },
      replacement: (content, node) => {
        const src = node.getAttribute('src');
        const ext = src.split(/#|\?/)[0].split('.').pop().trim();
        const srcWebp = src.replace(ext, 'webp');
        const srcset = node.getAttribute('srcset');
        const sizes = node.getAttribute('sizes');
        const alt = node.getAttribute('alt');

        const sourceSrcsetWebP = srcset
          ? `
  <source
    type="image/webp"${sizes ? `
    sizes="${sizes}"` : ''}
    srcset="${srcset.replace(new RegExp(ext, 'g'), 'webp')}" />
` : '';
        const sourceSrcWebP = srcWebp
          ? `
  <source
    type="image/webp"${sizes ? `
    sizes="${sizes}"` : ''}
    srcset="${srcWebp}" />
` : '';
        const sourceIMG = src
          ? `
  <img
    decoding="async"
    src="${src}"${sizes ? `
    sizes="${sizes}"` : ''}${srcset ? `
    srcset="${srcset}"` : ''}${alt ? `
    alt="${alt}"` : ''} />
` : '';

        return `
<picture>${sourceSrcsetWebP}${sourceSrcWebP}${sourceIMG}</picture>
`;
      },
    });

    // codepen blocks as iframe or block
    turndownService.addRule('codepenScript', {
      filter(node) {
        return (
          (
            (node.nodeName === 'P')
            && (node.classList.contains('codepen'))
          )
          || (
            (node.nodeName === 'IFRAME')
            && (node.getAttribute('src').indexOf('//codepen.io/') > -1)
          )
        );
      },
      replacement: (content, node) => {
        const data = this.getData(node);
        const search = query.stringify(data);
        return `\n\n[codepen=//codepen.io/${data.user}/pen/${data['slug-hash']}?${search}]\n\n`;
      },
    });

    // use gfm
    turndownService.use(turndownPluginGfm.gfm);
    let markdown = turndownService.turndown(page);

    // replace images and get sources
    let index = 0;
    let sources = '';
    markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]*)\)/igm, (match, alt, source) => {
      index += 1;
      sources = `${sources}\n[image-${index}]: ${source}`;
      return `!◐${alt}◑[image-${index}]`;
    });

    markdown = `${markdown}\n\n${sources}`;

    // replace links
    index = 0;
    sources = '';
    markdown = markdown.replace(/([^!])\[([^\]]*)\]\(([^)]*)\)/igm, (match, space, alt, source) => {
      index += 1;
      sources = `${sources}\n[${index}]: ${source}`;
      return `${space}[${alt}](${index})`;
    });

    // replace images to normal forms
    markdown = markdown.replace(/◐/igm, '[').replace(/◑/igm, ']');

    // return markdown;
    return `${markdown}\n\n${sources}`;
  }

  /**
   * Get data from codepen as block
   * @param  {[type]} node [description]
   * @return {[type]}      [description]
   */
  getData = (node) => {
    const data = {};
    if (node.getAttribute('data-theme-id')) data['theme-id'] = node.getAttribute('data-theme-id');
    if (node.getAttribute('data-slug-hash')) data['slug-hash'] = node.getAttribute('data-slug-hash');
    if (node.getAttribute('data-default-tab')) data['default-tab'] = node.getAttribute('data-default-tab');
    if (node.getAttribute('data-user')) data.user = node.getAttribute('data-user');
    if (node.getAttribute('data-embed-version')) data['embed-version'] = node.getAttribute('data-embed-version');
    if (node.getAttribute('data-pen-title')) data['pen-title'] = node.getAttribute('data-pen-title');
    return data;
  }

  /**
   * Get data from codepen as iframe
   * @param  {[type]} uri [description]
   * @return {[type]}     [description]
   */
  getDataIframe = (uri) => {
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
  }

  /**
   * Get all iframes codepens fork them to FMRobot account and replace links
   * @param  {string}  html - string with page source
   * @return {Promise} - promise will resolve with string containing modified page source
   */
  codepenTransformIFrame = async (html) => {
    const dom = new JSDOM(html);
    const elements = dom.window.document.querySelectorAll("iframe[src*='//codepen.io/']");
    const dataList = [];
    const pens = [];

    if (elements.length === 0) return html;
    Array.prototype.slice.call(elements).forEach((element) => {
      const data = this.getDataIframe(element.getAttribute('src'));
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

    return dom.serialize();
  }

  /**
   * Get all block codepens fork them to FMRobot account and replace links
   * @param  {[type]}  html [description]
   * @return {Promise}      [description]
   */
  codepenTransform = async (html) => {
    const dom = new JSDOM(html);
    const elements = dom.window.document.querySelectorAll('p.codepen');
    const pens = [];

    if (elements.length === 0) return html;

    Array.prototype.slice.call(elements).forEach((element) => {
      const data = this.getData(element);
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

    return dom.serialize();
  }

  /**
   * Download image and return filename
   * @param  {string}  uri     - image uri
   * @param  {string}  domain  - article domain
   * @return {Promise<string>} - filename
   */
  download = async (uri, domain) => {
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

    const DIR = path.resolve(
      ArticleBuilder.TMP_DIR_NAME,
      this.slug,
      ArticleBuilder.TMP_IMAGE_DIR_NAME,
    );

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
  };

  closest = (element, selector) => {
    if (element.matches(selector)) return element;
    if (element.parentNode === null) return null;
    return this.closest(element.parentNode, selector);
  }

  /**
   * getURLSFromString - transform string from attributes src and srcset
   *
   * @param {string} url Description
   * @method
   *
   * @return {array} array with urls
   */
  getURLSFromString = (url) => {
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
  }

  /**
   * [downloadImages description]
   * @param  {[type]}  page   [description]
   * @param  {[type]}  domain [description]
   * @return {Promise}        [description]
   */
  async downloadImages(page, domain) {
    const dom = new JSDOM(page);
    const linked = dom.window.document.querySelectorAll('a img');

    linked.forEach((img) => {
      const link = img.closest('a');
      link.before(img);
      link.remove();
    });

    const images = dom.window.document.querySelectorAll('img, picture source');

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

        if ((src === srcset) && this.isMercury) {
          const img = this.dom.window.document.querySelector(`img[src][srcset*="${decodeURI(element.getAttribute('src')).split(',')[0]}"]`);

          if (img !== null) {
            element.setAttribute('src', img.getAttribute('src'));
          }
        }
      }

      if (src !== null) {
        const urls = [...new Set(this.getURLSFromString(src))];
        downloads.push(urls);
      }
      if (srcset !== null) {
        const urls = [...new Set(this.getURLSFromString(srcset))];
        downloads.push(urls);
      }

      return downloads;
    });

    const list = [...new Set(flatten(downloadsList))];
    const downloads = list.map(async url => this.download(url, domain));
    const names = await Promise.all(downloads);
    let html = dom.window.document.documentElement.outerHTML;
    names.forEach(({ oldName, newName }) => {
      html = html.replace(new RegExp(oldName, 'g'), newName);
    });

    return html;
  }

  getSlug = (title, parsed) => {
    const titleSlug = title.toLowerCase().replace(/[?!;.,']+/ig, '').replace(/[^a-z]+/ig, '-').trim();

    if (titleSlug.length > 0) return titleSlug;

    const isHRU = !parsed.base.indexOf('.');
    const splitetURL = parsed.dir.split(/[\\/]/ig);
    let nameSlug;
    if (isHRU || splitetURL.length < 2) {
      nameSlug = parsed.name;
    } else {
      nameSlug = splitetURL.pop();
    }
    return nameSlug;
  }

  identifyCodeSnippets = async (page) => {
    const dom = new JSDOM(page);
    const snippets = dom.window.document.querySelectorAll('pre>code');
    const improbable = [
      'vb',
      'c++',
      'c',
      'c#',
      'objective-c',
      'swift',
      'java',
      'lua',
      'scala',
      'r',
      'ruby',
      'perl',
      'haskell',
      'python',
      'php',
    ];

    const languageResolve = Array.from(snippets).map((snippet) => {
      const className = snippet.className || '';
      const language = (className.match(/language-(\S+)/) || [null, ''])[1];
      if (language.length > 0) return snippet;
      return new Promise((resolve) => {
        Algorithmia.client('simXk8TZz3s0uyyXlZLA0c4L+sW1')
          .algo('PetiteProgrammer/ProgrammingLanguageIdentification/0.1.3')
          .pipe(snippet.textContent)
          .then((response) => {
            if (response.error !== undefined) resolve('');
            const probable = response.result.filter(lang => !improbable.includes(lang[0]));
            console.log(response);
            console.log(probable);
            console.log(`

            ${snippet.textContent}
            language: ${probable[0][0]}
            
            --------------------------------------
            `);
            snippet.classList.add(`language-${probable[0][0]}`);
            resolve(probable[0][0]);
          });
      });
    });

    await Promise.all(languageResolve);

    return dom.window.document.documentElement.outerHTML;
  }

  restoreCodeSnippets = (page) => {
    if (this.container === null) return page;
    const dom = new JSDOM(page);
    const mercuryCodeBlocks = dom.window.document.querySelectorAll('pre>code');
    const originalCodeBlocks = this.container.querySelectorAll('pre>code');

    mercuryCodeBlocks.forEach((block, index) => {
      block.replaceWith(originalCodeBlocks[index]);
    });

    return dom.window.document.documentElement.outerHTML;
  }

  getNodeSelector = (element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute('id');
    const classname = element.getAttribute('class').split(' ').join('.');
    let attributesSelector = '';
    const skipAttr = ['class', 'id'];
    for (let i = element.attributes.length - 1; i >= 0; i -= 1) {
      if (!skipAttr.includes(element.attributes[i].name)) attributesSelector += `[${element.attributes[i].name}="${element.attributes[i].value}"]`;
    }
    return `${tag}${id ? `#${id}` : ''}${classname ? `.${classname}` : ''}${attributesSelector || ''}`;
  }

  cleanDisqus = (page) => {
    const dom = new JSDOM(page);
    Array.from(dom.window.document.querySelectorAll('[class*="disqus"],[class*="dsq-"],[id*="disqus"]'))
      .forEach((node) => {
        if (node) node.parentNode.removeChild(node);
      });
    return dom.window.document.documentElement.outerHTML;
  }

  cleanHidden = (page) => {
    const dom = new JSDOM(page);
    Array.from(dom.window.document.querySelectorAll('[hidden],[style*="display:none"],[style*="display: none"]'))
      .forEach((node) => {
        if (node) node.parentNode.removeChild(node);
      });
    Array.from(dom.window.document.querySelectorAll('[style]'))
      .forEach((node) => {
        if (
          node
          && (
            (node.style.display === 'none')
            || (node.style.visibility === 'hidden')
            || (parseFloat(node.style.opacity) === 0)
          )
        ) {
          node.parentNode.removeChild(node);
        }
      });
    return dom.window.document.documentElement.outerHTML;
  }

  async create(url, slug = null) {
    this.isMercury = true;
    this.dom = await this.getArticleDOM(url);
    const pages = await this.getArticle(url);
    const parsed = path.parse(url);
    let content = pages.map(page => (page.content)).reduce((accumulator, page) => (`${accumulator}${page}`));

    const mercuryPage = new JSDOM(content);
    const body = mercuryPage.window.document.querySelector('body');
    const bodyFetch = this.dom.window.document.querySelector('body');
    const element = body.firstChild;
    const selector = this.getNodeSelector(element);
    let container = bodyFetch.querySelectorAll(selector);

    this.container = null;

    if (container.length === 1) {
      // this.isMercury = false;
      // content = container[0].outerHTML;
      [this.container] = container;
    } else if (container.length > 0) {
      container = Array.from(container);
      const selectors = Array.from(element.childNodes)
        .filter(node => (node.nodeType === 1))
        .map(this.getNodeSelector);
      container.filter(node => (
        Array.from(node.childNodes)
          .filter(child => (child.nodeType !== Node.TEXT_NODE))
          .find(
            kid => (!selectors.include(this.getNodeSelector(kid))),
          ) === undefined));
      if (container.length === 1) {
        // this.isMercury = false;
        // content = container[0].outerHTML;
        [this.container] = container;
      }
    }

    let domain;
    if (parsed.ext !== '') {
      domain = `${parsed.dir}/`;
    } else {
      domain = `${url}/`;
    }

    this.slug = slug || this.getSlug(pages[0].title, parsed);
    const articleDIR = path.resolve(ArticleBuilder.TMP_DIR_NAME, this.slug);
    const articleImagesDIR = path.resolve(articleDIR, ArticleBuilder.TMP_IMAGE_DIR_NAME);
    if (!fs.existsSync(articleDIR)) fs.mkdirSync(articleDIR);
    if (!fs.existsSync(articleImagesDIR)) fs.mkdirSync(articleImagesDIR);

    // console.log(`

    //   ${content}

    // `);

    content = this.cleanDisqus(content);
    content = this.cleanHidden(content);
    content = this.restoreCodeSnippets(content);
    // content = await this.identifyCodeSnippets(content);
    content = await this.downloadImages(content, domain);
    content = await this.codepenTransformIFrame(content);
    content = await this.codepenTransform(content);
    content = this.convertToMD(content);

    content = prettier.format(content, {
      parser: 'markdown',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    });

    // html source converted to markdown
    fs.writeFileSync(path.resolve(
      ArticleBuilder.TMP_DIR_NAME,
      this.slug,
      'eng.md',
    ), content);

    // translation dummy
    fs.writeFileSync(path.resolve(
      ArticleBuilder.TMP_DIR_NAME,
      this.slug,
      'rus.md',
    ), content);

    const gitHubUtils = new GitHubUtils();
    await gitHubUtils.createRepo(this.slug, pages[0].title);
    await gitHubUtils.uploadDir(articleDIR);
    rimraf.sync(articleDIR);

    // return content;
  }
}

(async () => {
  try {
    const builder = new ArticleBuilder();
    await builder.create('https://daveceddia.com/intro-to-hooks/');
    // const result =
    // console.log(result);
  } catch (error) {
    console.log(error);
  }
})();
