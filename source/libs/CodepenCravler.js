const puppeteer = require('puppeteer');
const Joi = require('joi');

/**
 * Class to fork pens
 * 
 * @class CodepenCravler
 * @throws Error — if not all data was set
 */
export default class CodepenCravler {
    
  /**
   * Constructor set up some 
   * @param {Array | string } pens - array of pen urls or string with pen url
   * @param {string} login - github login
   * @param {string} passw - password of github
   *
   * @throws {Error} - JOI attribute validation error message
   * @return {Promise<Array> | Promise<string>} - promise with array or string, depending on pens argument type
   */
  constructor ({ 
    pens, 
    login, 
    passw
  }) {
    const schema = Joi.object().keys({
      login: Joi.string().required(),
      passw: Joi.string().required(),
      pens: Joi.alternatives(
        Joi.array().items(Joi.string().uri({scheme: 'https'})).min(1).required(), 
        Joi.string().uri({scheme: 'https'}).required()
      ),
    });
    
    const result = Joi.validate({
      login,
      passw,
      pens,
    }, schema);
    
    if (result.error !== null) throw new Error(result.false);
    
    this.GITHUB_LOGIN = login;
    this.GITHUB_PASSW = passw;
    this.pens = pens;

    this.CODEPEN_LOGIN = "#login-button";
    this.GITHUB_SUBMIT = "input[type='submit']";
    this.GITHUB_RELOGIN = '#js-oauth-authorize-btn';
    this.GITHUB_SELECTOR = '#login-with-github';
    this.GITHUB_LOGIN_SELECTOR = '#login_field';
    this.GITHUB_PASSW_SELECTOR = '#password';
    this.CODEPEN_PAGE = '#init-data';
    this.FORK_SELECTOR = '#fork';
    this.CODEPEN_PROFILE = '#mini-personal-avatar';
    
    return this.forkPens();
  }
  
  /**
   * Fork pens
   * @return {Promise<Array> | Promise<string>} - promise with array or string, depending on pens argument type
   */
  forkPens = async () => {
    this.browser = await puppeteer.launch({headless: true});
    this.page = await this.browser.newPage();
    this.page.goto('https://codepen.io/');
    this.page.waitForSelector(this.CODEPEN_LOGIN).then(this.githubLogin);
    this.page.waitForSelector(this.GITHUB_RELOGIN).then(this.githubReAuth);
    return this.page.waitForSelector(this.CODEPEN_PROFILE).then(this.fork);
  }
  
  /**
   * Actions list to login on github
   */
  githubLogin = async () => {
    await this.page.click(this.CODEPEN_LOGIN);
    await this.page.waitForSelector(this.GITHUB_SELECTOR);
    await this.page.click(this.GITHUB_SELECTOR);
    await this.page.waitForSelector(this.GITHUB_LOGIN_SELECTOR);
    await this.page.click(this.GITHUB_LOGIN_SELECTOR);
    await this.page.keyboard.type(this.GITHUB_LOGIN);
    await this.page.click(this.GITHUB_PASSW_SELECTOR);
    await this.page.keyboard.type(this.GITHUB_PASSW);
    await this.page.click(this.GITHUB_SUBMIT);
    this.page.waitForSelector(this.CODEPEN_LOGIN).then(this.githubLogin);
  }
  
  /**
   * If you need another auth step on github this function runs
   */
  githubReAuth = async () => {
    await this.page.waitFor(1000);
    await this.page.click(this.FORK_SELECTOR);
    this.page.waitForSelector(this.GITHUB_RELOGIN).then(this.githubReAuth);
  }

  /**
   * fork specific url
   * @param  {string}  url - pen url
   * @return {Promise<string>} - promise with new forked pen uri
   */
  forkPen = async (url) => {
    await this.page.goto(url);
    await this.page.waitForSelector(this.FORK_SELECTOR);
    await this.page.click(this.FORK_SELECTOR);
    await this.page.waitForNavigation();
    return this.page.url();
  }

  /**
   * fork pens list
   * @return {Promise<Array> | Promise<string>} - promise with array or string, depending on pens argument type
   */
  fork = async () => {
    if (Array.isArray(this.pens)) {
      let forks = [];
      for (let pen of this.pens) {
        forks.push(await this.forkPen(pen));
      }
      this.browser.close();
      return forks;
    } else if (typeof this.pens === 'string') {
      const uri = await this.forkPen(this.pens);
      this.browser.close();
      return uri;
    }
  }
}