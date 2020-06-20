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
    author: (author && author.textContent) || (creator && creator.textContent),
    title: title && title.textContent,
    description: (description && description.textContent) || (abstract && abstract.textContent),
    created: (created && created.textContent) || (published && published.textContent),
    modified: modified && modified.textContent,
  };
};
