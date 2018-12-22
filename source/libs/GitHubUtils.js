/* eslint-disable class-methods-use-this */
const Octokit = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const flatten = require('array-flatten');

/**
* GitHubUtils - Description
* @namespace
* @class
*/
class GitHubUtils {
  /**
   * constructor - authentificate on github
   * @constructor
   * @param {string | null} token - github app token
   */
  constructor(token = null) {
    GitHubUtils.ORG_NAME = 'FrontenderMagazine';
    GitHubUtils.DOMAIN_NAME = 'https://frontender.info/';
    GitHubUtils.MESSAGE_FILE = 'Adding file ';
    GitHubUtils.PROJECT_NAME = 'Перевод';
    GitHubUtils.COLUMN_NAME = 'Запланировано';

    this.octokit = Octokit();
    this.octokit.authenticate({
      type: 'token',
      token: token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * createRepo — create repository
   * @param {string} slug - repo name
   * @param {string} title — repo description
   */
  async createRepo(slug, title) {
    const options = {
      org: GitHubUtils.ORG_NAME,
      name: slug,
      description: title,
      homepage: `${GitHubUtils.DOMAIN_NAME}${slug}/`,
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: false,
    };
    this.repo = slug;
    return this.octokit.repos.createInOrg(options);
  }

  setRepo(slug) {
    this.repo = slug;
  }

  async getProjectsList() {
    const projects = await this.octokit.projects.listForOrg({ org: GitHubUtils.ORG_NAME });
    this.project = projects.data.find(project => (project.name === GitHubUtils.PROJECT_NAME));
    if (this.project === undefined) throw new Error('Project lost');
    return this.project;
  }

  async getColumnsList(id) {
    const columns = await this.octokit.projects.listColumns({ project_id: id });
    this.column = columns.data.find(column => (column.name === GitHubUtils.COLUMN_NAME));
    if (this.column === undefined) throw new Error('Column lost');
    return this.column;
  }

  /**
   * createIssue — create github issue for repository
   * @param {string} title - issue title
   * @param {string} body - issue body
   * @param {object} - issue body
   */
  async createIssue(url, title, body = '', tags = [], assignees = []) {
    // @todo добавить ссылку на статью и репозиторий в таск
    const issueBody = body || `
- [ ] Перевод
- [ ] Вычитка
- [ ] Очередь на публикацию
- [ ] Опубликован

[Ссылка на репозиторий](https://github.com/${GitHubUtils.ORG_NAME}/${this.repo}/)
[Ссылка на оригинальную статью](${url})
[Ссылка на перевод после публикации](https://frontender.info/${this.repo}/)
`;
    const options = {
      owner: GitHubUtils.ORG_NAME,
      repo: this.repo,
      title,
      body: issueBody,
      // assignee,
      // milestone,
      labels: tags,
      assignees,
    };
    const issue = await this.octokit.issues.create(options);
    return issue;
  }

  async createCard(url, title, tags = [], assignees = []) {
    const project = await this.getProjectsList();
    const column = await this.getColumnsList(project.id);
    const issue = await this.createIssue(url, title, null, tags, assignees);
    const card = await this.octokit.projects.createCard({
      column_id: column.id,
      // note: title,
      content_id: issue.data.id,
      content_type: 'Issue',
    });
    return card;
  }

  readdir(uri) {
    const files = fs.readdirSync(uri, { withFileTypes: true });
    return flatten(files.map((file) => {
      const fileURI = path.resolve(uri, file.name);
      if (file.isDirectory()) {
        return this.readdir(fileURI);
      }
      return this.upload(fileURI);
    }));
  }

  base64Encode(uri) {
    const file = fs.readFileSync(uri);
    return Buffer.from(file).toString('base64');
  }

  upload(uri) {
    const content = this.base64Encode(uri);
    const folders = uri.split(path.sep);
    const index = folders.lastIndexOf(this.repo);
    if (index === -1) throw new Error('We have lost our repo temp directory');
    const relative = folders.slice(index + 1).join(path.sep);
    const options = {
      owner: GitHubUtils.ORG_NAME,
      repo: this.repo,
      path: relative,
      message: `${GitHubUtils.MESSAGE_FILE}${relative}`,
      content,
    };
    return options;
  }

  async uploadDir(uri) {
    return (new Promise(async (resolve, reject) => {
      const result = [];
      const optionsSet = this.readdir(uri);
      let index = optionsSet.length;
      // eslint-disable-next-line no-plusplus
      while (index--) {
        try {
          // eslint-disable-next-line no-await-in-loop
          result.push(await this.octokit.repos.createFile(optionsSet[index]));
        } catch (error) {
          reject(error);
        }
      }
      resolve(result);
    }));
  }
}

module.exports = GitHubUtils;
