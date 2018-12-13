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
    return this.octokit.repos.createForOrg(options);
  }

  setRepo = (slug) => {
    this.repo = slug;
  }

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
