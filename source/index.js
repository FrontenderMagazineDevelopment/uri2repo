import '@babel/polyfill';
import TurndownService from 'turndown';
import query from 'query-string';
import CodepenCravler from './libs/CodepenCravler';
const jsdom = require('jsdom');
const urlParser = require('url');
const imageType = require('image-type');
const readChunk = require('read-chunk');
const path = require('path');
const fs = require('fs');
const download = require('download-file');
const { JSDOM } = jsdom;
const prettier = require('prettier');

import Mercury from '@frontender-magazine/mercury-sdk';

require('dotenv').config({path: '../.env'});
const turndownPluginGfm = require('turndown-plugin-gfm');

import pager from './__mock__/page.js';

export default class ArticleBuilder {

  /**
   * Get article from mercury service
   * @param  {string}  url - url of page
   * @return {Promise<string>} - markdown
   */
  async getArticle(url) {
    const parser = new Mercury(process.env.MERCURY_KEY);
    return [pager];
    // return parser.getAll(url);
  }

  /**
   * convert to markdown
   * @param  {[type]} page [description]
   * @return {[type]}      [description]
   */
  convertToMD(page) {
    const turndownService = new TurndownService();

    // iframe
    turndownService.addRule('picture', {
      filter:  function (node, options) {
        return ((node.nodeName == 'IFRAME')
          && (node.getAttribute('src').indexOf('//codepen.io/') === -1));
      },
      replacement: (content, node, options) => {
        return node.outerHTML;
      }
    });

    // picture
    turndownService.addRule('picture', {
      filter:  function (node, options) {
        return (node.nodeName == 'PICTURE');
      },
      replacement: (content, node, options) => {
        return node.outerHTML;
      }
    });

    // codepen blocks as iframe or block
    turndownService.addRule('codepenScript', {
      filter:  function (node, options) {
        return (
          ((node.nodeName == 'P')&&(node.classList.contains('codepen'))
          || (
            (node.nodeName == 'IFRAME')
            && (node.getAttribute('src').indexOf('//codepen.io/') > -1)
          )
        ));
      },
      replacement: (content, node, options) => {
        const data = this.getData(node);
        let search = query.stringify(data);
        return `\n\n[codepen=//codepen.io/${data.user}/pen/${data['slug-hash']}?${search}]\n\n`;
      }
    });

    // use gfm
    turndownService.use(turndownPluginGfm.gfm);
    let markdown = turndownService.turndown(page);

    // replace images and get sources
    let index = 0;
    let sources = '';
    markdown = markdown.replace(/!\[([^\]]*)\]\(([^\)]*)\)/igm, (match, alt, source, offset, string) => {
      index++;
      sources = `${sources}\n[image-${index}]: ${source}`;
      return `!◐${alt}◑[image-${index}]`;
    });
    
    markdown = `${markdown}\n\n${sources}`;
    
    // replace links
    index = 0;
    sources = '';
    markdown = markdown.replace(/([^!])\[([^\]]*)\]\(([^\)]*)\)/igm, (match, space, alt, source, offset, string) => {
      index++;
      sources = `${sources}\n[${index}]: ${source}`;
      return `${space}[${alt}](${index})`;
    });

    // replace images to normal forms
    markdown = markdown.replace(/◐/igm,'[').replace(/◑/igm,']');
    
    // return markdown;
    return `${markdown}\n\n${sources}`;
  }

  /**
   * Get data from codepen as block
   * @param  {[type]} node [description]
   * @return {[type]}      [description]
   */
  getData = node => {
    const data = {};
    if(node.getAttribute('data-theme-id')) data['theme-id'] = node.getAttribute('data-theme-id');
    if(node.getAttribute('data-slug-hash')) data['slug-hash'] = node.getAttribute('data-slug-hash');
    if(node.getAttribute('data-default-tab')) data['default-tab'] = node.getAttribute('data-default-tab');
    if(node.getAttribute('data-user')) data['user'] = node.getAttribute('data-user');
    if(node.getAttribute('data-embed-version')) data['embed-version'] = node.getAttribute('data-embed-version');
    if(node.getAttribute('data-pen-title')) data['pen-title'] = node.getAttribute('data-pen-title');
    return data;
  }
  
  /**
   * Get data from codepen as iframe
   * @param  {[type]} uri [description]
   * @return {[type]}     [description]
   */
  getDataIframe = uri => {
    const parsed = urlParser.parse(uri, true, true);
    const matched = parsed.pathname.match(/\/([^\/]+)\/embed\/([^\/]+)(\/)?/i);
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
   * @param  {[type]}  html [description]
   * @return {Promise}      [description]
   */
  codepenTransformIFrame = async (html) => {
    const dom = new JSDOM(html);
    const elements = dom.window.document.querySelectorAll("iframe[src*='//codepen.io/']");
    const dataList = [];
    const pens = [];
    
    for (let element of elements) {
      const data = this.getDataIframe(element.getAttribute('src'));
      dataList.push(data);
      pens.push(`https://codepen.io/${data['user']}/pen/${data['slug-hash']}/`);
    }
    
    const forks = await new CodepenCravler({
      login: process.env.GITHUB_LOGIN,
      passw: process.env.GITHUB_PASSW,
      pens: pens,
    });
    
    for (let i=0; i < forks.length; i++) {
      const fork = forks[i];
      const data = dataList[i];
      const nodes = Array.from(elements);
      const parsed = urlParser.parse(fork, true, true);
      for (let attribute in data) {
        nodes[i].setAttribute(`data-${attribute}`, data[attribute]);
      }
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
    const elements = dom.window.document.querySelectorAll("p.codepen");
    const dataList = [];
    const pens = [];

    for (let element of elements) {
      const data = this.getData(element);
      dataList.push(data);
      pens.push(`https://codepen.io/${data['user']}/pen/${data['slug-hash']}/`);
    }

    const forks = await new CodepenCravler({
      login: process.env.GITHUB_LOGIN,
      passw: process.env.GITHUB_PASSW,
      pens: pens,
    });
    
    for (let i=0; i < forks.length; i++) {
      const fork = forks[i];
      const data = dataList[i];
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
    console.log('url to download: ', newUrl);
    const result = await fetch(newUrl, { method: 'GET' });
    let name = path.basename(newUrl);
    const type = result.headers._headers['content-type'][0];
    const contentType = /([\w]+)\/([\s\w]+)(;[^$]*)?/ig;
    const matched = contentType.exec(type)
    if (matched[1] !== 'image') throw new Error('not an image');
    if(path.extname(newUrl).length < 4) name = name.replace(/.?$/, `.${matched[2]}`);
    const fileStream = fs.createWriteStream(path.resolve('./tmp', name));
    return new Promise((resolve, reject) => {
      result.body.pipe(fileStream);
      result.body.on("error", reject);
      fileStream.on("finish", resolve.bind(this, name));
    });
  };


  /**
   * [downloadImages description]
   * @param  {[type]}  page   [description]
   * @param  {[type]}  domain [description]
   * @return {Promise}        [description]
   */
  async downloadImages(page, domain) {
    const dom = new JSDOM(page);
    const linked = dom.window.document.querySelectorAll("a img");

    linked.forEach((img, index) => {
      const link = this.closest(img, 'a');
      const container = link.parentNode;
      container.insertBefore(img, link);
      container.removeChild(link);
    });

    const images = dom.window.document.querySelectorAll("img, picture source");
    let downloads = [];

    await Promise.all(Array.from(images).map(async (element) => {
      const src = element.getAttribute('src');
      if  (src !== null) {
        const parsedSource = urlParser.parse(src);
        let name = `${parsedSource.pathname.split('/').pop()}`;
        try {
          name = await this.download(src, domain);
        } catch (error) {
          console.log('error on src: ', src);
          console.log('error while downloading: ', error);
        }
        
        element.setAttribute('src', `images/${name}`);
      }

      let srcset = element.getAttribute('srcset');
      if (srcset !== null) {
        srcset = srcset.split(',').map(async (item)=>{
          const parts = item.trim().split(' ');
          let name = `${urlParser.parse(parts[0]).pathname.split('/').pop()}`;
          try {
            name = await this.download(src, domain);
          } catch (error) {
            console.log('error on src: ', src);
            console.log('error while downloading: ', error);
          }
          
          parts[0] = `images/${name}`;
          return parts.join(' ');
        }).join(',');
        element.setAttribute('srcset', srcset);
      }
    }));

    return dom.window.document.documentElement.outerHTML;
  }


  async create(url, slug=null, author=null) {
    const pages = await this.getArticle(url);
    const parsed = path.parse(url);
    let domain;
    if (parsed.ext !== '') {
      domain = `${parsed.dir}/`;
    } else {
      domain = `${url}/`;
    }
    let content = pages.map(page => (page.content)).reduce((accumulator, page) => (`${accumulator}${page}`));
    content = await this.downloadImages(content, domain);
    content = await this.codepenTransformIFrame(content);
    content = await this.codepenTransform(content);
    const markdown = this.convertToMD(content);
    return prettier.format(markdown, {
      parser: "markdown",
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    });
  }
} 

(async () => {
  try {
    const builder = new ArticleBuilder();
    const result = await builder.create('https://alistapart.com/article/fixing-variable-scope-issues-with-ecmascript-6');
    console.log(result);
  } catch (error) {
    console.log(error);
  }
})();