# Builder
Этот билдер создает из url статьи репозиторий на гитхабе и выполняет все сопутствующие действия.

# Environment variables

## createCards, createRepo, initGithub, uploadToRepo
* GITHUB_TOKEN

## codepenTransform and codepenTransformIFrame
* GITHUB_LOGIN
* GITHUB_PASSW

## detectLanguage
* DETECTLANGUAGE_KEY

## getTags
* AWSAccessKeyId
* AWSSecretKey


# You may ignore build stages and specific plugins

```javascript
this.skip = {
      plugins: [
        {
          name: 'TMPDir', // plugin TMPDir
          stages: 'after', // will be ignored on after stage
        },
        { name: 'uploadToRepo' }, // plugin uploadToRepo will be ignored on all stages
      ],
      stages: [
        'github:before', // stage will be ignored
      ],
    };
```

# You may create plugins

```javascript
// File: /source/plugins/pluginName/pluginName.js
module.exports = deepmerge(pluginBase, {
  meta: {
    name: 'PluginName', // plugin name, required
    dependency: ['PluginDep', 'PluginDep:StageName'], // plugin dependency, optional
    domain: 'https://smashingmagazine.com' // plugin valid only for specific domain, optional
  },
  StageName: (unmodified) => {return modified;}, // methods for stage 'StageName'
  [['StageName:before']]: (unmodified) => {return modified;}, // methods for stage 'StageName:before'
});
```
