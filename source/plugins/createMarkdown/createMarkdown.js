const prettier = require('prettier');
const query = require('query-string');
const deepmerge = require('deepmerge');
const TurndownService = require('turndown');
const turndownPluginGfm = require('turndown-plugin-gfm');
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
    name: 'createMarkdown',
    dependency: ['mercury'],
  },

  /**
   * convertToMD - convert to markdown
   */
  convertToMD: (dom) => {
    const turndownService = new TurndownService({
      codeBlockStyle: 'fenced',
      fence: '~~~',
      linkStyle: 'referenced',
      headingStyle: 'atx',
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
        let src = node.getAttribute('src');
        if (!src) return node.outerHTML;
        const ext = src.split(/#|\?/)[0].split('.').pop().trim();
        const srcWebp = src.replace(ext, 'webp');
        const srcset = node.getAttribute('srcset');
        const sizes = node.getAttribute('sizes');
        const alt = node.getAttribute('alt');

        if (decodeURI(src).trim().indexOf(' ') > -1) {
          [src] = src.split(' ');
        }

        if (decodeURI(src).trim().indexOf(',') > -1) {
          [src] = src.split(',');
        }

        const sourceSrcsetWebP = srcset
          ? `
  <source
    type="image/webp"${sizes ? `
    sizes="${decodeURI(sizes)}"` : ''}
    srcset="${decodeURI(srcset.replace(new RegExp(ext, 'g'), 'webp'))}" />
` : '';
        const sourceSrcWebP = srcWebp
          ? `
  <source
    type="image/webp"${sizes ? `
    sizes="${decodeURI(sizes)}"` : ''}
    srcset="${decodeURI(srcWebp)}" />
` : '';
        const sourceIMG = src
          ? `
  <img decoding="async"
    src="${decodeURI(src)}"${sizes ? `
    sizes="${decodeURI(sizes)}"` : ''}${srcset ? `
    srcset="${decodeURI(srcset)}"` : ''}${alt ? `
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
    let markdown = turndownService.turndown(dom.window.document.documentElement.outerHTML);

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
  },

  /**
   * match mercury and fetch dom containers
   * @param {object} unmodified - current article sate
   * @return {object} - modified article state
   */
  [['mutation:after']]: (unmodified) => {
    const {
      meta: {
        name,
        dependency,
        domain,
      },
      convertToMD,
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

    try {
      if (!domainCheck(url, domain)) return unmodified;
      dependencyCheck(stack, dependency, name);
      let markdown = convertToMD(mercury);

      markdown = prettier.format(markdown, {
        parser: 'markdown',
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
      });

      modified.markdown = markdown;
      modified.stack.push(name);
      return modified;
    } catch (error) {
      return unmodified;
    }
  },
});
