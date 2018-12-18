import Octokit from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import flatten from 'array-flatten';

/**
* GitHubUtils - Description
* @namespace
* @class
*/
export default class GitHubUtils {
  static ORG_NAME = 'FrontenderMagazine';

  static DOMAIN_NAME = 'https://frontender.info/';

  static MESSAGE_FILE = 'Adding file ';

  static PROJECT_NAME = 'Перевод';

  static COLUMN_NAME = 'Запланировано';

  /**
   * constructor - authentificate on github
   * @constructor
   * @param {string | null} token - github app token
   */
  constructor(token = null) {
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
  createRepo = async (slug, title) => {
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

  setRepo = (slug) => {
    this.repo = slug;
  }

  getProjectsList = async () => {
    const projects = await this.octokit.projects.listForOrg({ org: GitHubUtils.ORG_NAME });
    this.project = projects.data.find(project => (project.name === GitHubUtils.PROJECT_NAME));
    if (this.project === undefined) throw new Error('Project lost');
    return this.project;
  };

  getColumnsList = async (id) => {
    const columns = await this.octokit.projects.listColumns({ project_id: id });
    this.column = columns.data.find(column => (column.name === GitHubUtils.COLUMN_NAME));
    if (this.column === undefined) throw new Error('Column lost');
    return this.column;
  };

  /**
   * createIssue — create github issue for repository
   * @param {string} title - issue title
   * @param {string} body - issue body
   * @param {object} - issue body
   */
  createIssue = async (title, body = '', tags = []) => {
    const issueBody = body || `
- [ ] Перевод
- [ ] Вычитка
- [ ] Очередь на публикацию
- [ ] Опубликован
`;
    const issue = await this.octokit.issues.create({
      owner: GitHubUtils.ORG_NAME,
      repo: this.repo,
      title,
      body: issueBody,
      // assignee,
      // milestone,
      labels: tags,
      // assignees
    });
    return issue;
  };

  createCard = async (title, tags = []) => {
    const project = await this.getProjectsList();
    const column = await this.getColumnsList(project.id);
    const issue = await this.createIssue(title, null, tags);
    const card = await this.octokit.projects.createCard({
      column_id: column.id,
      // note: title,
      content_id: issue.data.id,
      content_type: 'Issue',
    });

    return card;
  };

  readdir = (uri) => {
    const files = fs.readdirSync(uri, { withFileTypes: true });
    return flatten(files.map((file) => {
      const fileURI = path.resolve(uri, file.name);
      if (file.isDirectory()) {
        return this.readdir(fileURI);
      }
      return this.upload(fileURI);
    }));
  }

  base64Encode = (uri) => {
    const file = fs.readFileSync(uri);
    return Buffer.from(file).toString('base64');
  }

  upload = (uri) => {
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
  };

  uploadDir = async uri => (new Promise(async (resolve, reject) => {
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
