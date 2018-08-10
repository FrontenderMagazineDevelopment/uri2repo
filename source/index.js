import '@babel/polyfill';
import TurndownService from 'turndown';
import query from 'query-string';
import CodepenCravler from './libs/CodepenCravler';
import download from 'image-downloader';
const jsdom = require('jsdom');
const urlParser = require('url');
const { JSDOM } = jsdom;

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
    images.forEach((element, index) => {

      const src = element.getAttribute('src');
      if  (src !== null) {
        const parsedSource = url.parse(src);
        element.setAttribute('src', `images/${parsedSource.pathname.split('/').pop()}`);
        downloads.push(src);
      }

      let srcset = element.getAttribute('srcset');
      if (srcset !== null) {
        srcset = srcset.split(',').map((item)=>{
          const parts = item.trim().split(' ');
          downloads.push(parts[0]);
          parts[0] = `images/${url.parse(parts[0]).pathname.split('/').pop()}`;
          return parts.join(' ');
        }).join(',');
        element.setAttribute('srcset', srcset);
      }

    });

    downloads = downloads.map((url) => {
      const isAbsolute = /(^\/\/:)|(^http)/ig.test(url);
      const newUrl = isAbsolute ? url : `${domain}${url}`;
      return newUrl;
    });

    downloads.forEach(url => {
      try {
          download({
            url,
            dest: '/Users/silentimp/Work/builder/tmp/',
          });
      } catch (error) {
        console.log('error: ', error);
      } // eslint-disable-line
    });

    return dom.window.document.documentElement.outerHTML;
  }


  async create(url, slug=null, author=null) {
    const pages = await this.getArticle(url);
    let content = pages.map(page => (page.content)).reduce((accumulator, page) => (`${accumulator}${page}`));
    content = await this.codepenTransformIFrame(content);
    content = await this.codepenTransform(content);
    const markdown = this.convertToMD(content);
    return markdown;
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