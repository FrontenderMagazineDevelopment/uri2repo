module.exports = {
  articleSchema: (dom) => {
    const container = dom.original.document.querySelector('[itemscope][itemtype="http://schema.org/Article"]');
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
      author: author.innerHTML || creator.innerHTML,
      title: title.innerHTML,
      description: description.innerHTML || abstract.innerHTML,
      created: created.innerHTML || published.innerHTML,
      modified: modified.innerHTML,
    };
  },
};
