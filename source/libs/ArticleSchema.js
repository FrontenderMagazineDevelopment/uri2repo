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
      (author && author.textContent.replace(/[\r\n]+/gm, '').trim())
      || (creator && creator.textContent.replace(/[\r\n]+/gm, '').trim()),
    title: title && title.textContent.replace(/[\r\n]+/gm, '').trim(),
    description:
      (description && description.textContent.replace(/[\r\n]+/gm, '').trim())
      || (abstract && abstract.textContent.replace(/[\r\n]+/gm, '').trim()),
    created:
      (created && created.textContent.replace(/[\r\n]+/gm, '').trim())
      || (published && published.textContent.replace(/[\r\n]+/gm, '').trim())
      || (modified && modified.textContent.replace(/[\r\n]+/gm, '').trim()),
    modified: modified && modified.textContent.replace(/[\r\n]+/gm, '').trim(),
  };
};
