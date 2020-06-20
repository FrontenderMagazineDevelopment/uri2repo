module.exports = (dom) => {
  const container = dom.window.document.body.querySelector('[itemscope][itemtype="http://schema.org/Article"]');
  if (container === null) return null;
  const author = container.querySelector('[itemprop="author"]');
  const creator = container.querySelector('[itemprop="creator"]');
  const title = container.querySelector('[itemprop="name"]');
  const description = container.querySelector('[itemprop="description"]');
  const abstract = container.querySelector('[itemprop="abstract"]');
  const created = container.querySelector('[itemprop="dateCreated"]');
  const modified = container.querySelector('[itemprop="dateModified"]');
  const published = container.querySelector('[itemprop="datePublished"]');
  return {
    author:
      (author && author.textContent.replace(/[\r\n]+/gm, ''))
      || (creator && creator.textContent.replace(/[\r\n]+/gm, '')),
    title: title && title.textContent.replace(/[\r\n]+/gm, ''),
    description:
      (description && description.textContent.replace(/[\r\n]+/gm, ''))
      || (abstract && abstract.textContent.replace(/[\r\n]+/gm, '')),
    created:
      (created && created.textContent.replace(/[\r\n]+/gm, ''))
      || (published && published.textContent.replace(/[\r\n]+/gm, ''))
      || (modified && modified.textContent.replace(/[\r\n]+/gm, '')),
    modified: modified && modified.textContent.replace(/[\r\n]+/gm, ''),
  };
};
