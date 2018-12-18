import KeywordExtractor from 'keyword-extractor';
import RakeJS from 'rake-js';
import retext from 'retext';
import keywordsPlugin from 'retext-keywords';
import vfile from 'vfile';
import AWS from 'aws-sdk';
import flatten from 'array-flatten';
import striptags from 'striptags';
import compromise from 'compromise';

import tags from '../../data/tags';

export default class TagExtractor {
  constructor(sentence) {
    return this.comprehend(sentence);
  }

  comprehend = sentence => (new Promise((resolve, reject) => {
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
      const keywords = flatten(data.ResultList.map(item => (item.Entities)))
        .map(item => (item.Text.toLowerCase()));
      return resolve(
        this.filterPredefined(keywords),
      );
    });
  }));

  retext = sentence => (new Promise((resolve, reject) => {
    const vSentence = vfile(sentence);
    retext()
      .use(keywordsPlugin)
      .process(vSentence, (error, file) => {
        if (error) return reject(error);
        return resolve(
          this.filterPredefined(
            file.data.keywords.map(keyword => (keyword.stem)),
          ),
        );
      });
  }));

  rake = (sentence) => {
    const keywords = RakeJS(sentence, { language: 'english' });
    return this.filterPredefined(keywords);
  };

  keywordExtractor = (sentence) => {
    const keywords = KeywordExtractor.extract(sentence, {
      language: 'english',
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
    });

    return this.filterPredefined(keywords);
  };

  filterPredefined = (keywords) => {
    const result = keywords.filter((keyword) => {
      let normalizedForm = compromise(keyword);
      normalizedForm.nouns().toSingular();
      normalizedForm = normalizedForm.out('root');

      // console.log(`'${keyword}' transformed to '${normalizedForm}'`);
      if (normalizedForm.trim().length === 0) return false;
      return tags.includes(normalizedForm);
    });
    console.log('keywords: ', [...new Set(result)]);
    return [...new Set(result)];
  };
}
