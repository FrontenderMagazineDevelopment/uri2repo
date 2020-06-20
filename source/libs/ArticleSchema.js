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
      (author && author.textContent.trim())
      || (creator && creator.textContent.trim()),
    title: title && title.textContent.trim(),
    description:
      (description && description.textContent.trim())
      || (abstract && abstract.textContent.trim()),
    created:
      (created && created.textContent.trim())
      || (published && published.textContent.trim())
      || (modified && modified.textContent.trim()),
    modified: modified && modified.textContent.trim(),
  };
};
