/* eslint-disable class-methods-use-this */
const KeywordExtractor = require('keyword-extractor');
const RakeJS = require('rake-js');
const retext = require('retext');
const keywordsPlugin = require('retext-keywords');
const vfile = require('vfile');
const AWS = require('aws-sdk');
const { flatten } = require('array-flatten');
const striptags = require('striptags');
const compromise = require('compromise');
const tags = require('../../data/tags');
const synonyms = require('../../data/synonyms');

class TagExtractor {
  constructor(sentence) {
    // this.retext(sentence);
    // this.rake(sentence);
    // this.keywordExtractor(sentence);
    return this.comprehend(sentence);
  }

  comprehend(sentence) {
    return (new Promise((resolve, reject) => {
      const comprehend = new AWS.Comprehend({
        accessKeyId: process.env.AWSAccessKeyId,
        secretAccessKey: process.env.AWSSecretKey,
        region: 'eu-central-1', // EU (Frankfurt)
        apiVersion: '2017-11-27',
      });

      comprehend.batchDetectEntities({
        LanguageCode: 'en',
        TextList: striptags(sentence)
          .replace(/~~~([\s\S]+?)~~~/g, '')
          .replace(/\[[\d]+\]: https:\/\/[^\n]+\n/g, '')
          .replace(/\n[ ]+\n/g, '')
          .replace(/[\n]{2,}/g, '\n\n')
          .trim()
          .match(/[\s\S]{1,3999}/g),
      }, (error, data) => {
        if (error) return reject(error);
        const keywords = flatten(data.ResultList.map((item) => (item.Entities)))
          .map((item) => (item.Text.toLowerCase()));
        return resolve(
          this.filterPredefined(keywords),
        );
      });
    }));
  }

  retext(sentence) {
    return (new Promise((resolve, reject) => {
      const vSentence = vfile(sentence);
      retext()
        .use(keywordsPlugin)
        .process(vSentence, (error, file) => {
          if (error) return reject(error);
          return resolve(
            this.filterPredefined(
              file.data.keywords.map((keyword) => (keyword.stem)),
            ),
          );
        });
    }));
  }

  rake(sentence) {
    const keywords = RakeJS(sentence, { language: 'english' });
    return this.filterPredefined(keywords);
  }

  keywordExtractor(sentence) {
    const keywords = KeywordExtractor.extract(sentence, {
      language: 'english',
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
    });

    return this.filterPredefined(keywords);
  }

  filterPredefined(keywords) {
    const result = keywords
      .map((keyword) => {
        let normalizedForm = compromise(keyword);
        normalizedForm.nouns().toSingular();
        normalizedForm = normalizedForm.out('root');
        return (synonyms[normalizedForm] || normalizedForm);
      })
      .filter((keyword) => {
        if (keyword.trim().length === 0) return false;
        return tags.includes(keyword);
      });
    return [...new Set(result)];
  }
}

module.exports = TagExtractor;
