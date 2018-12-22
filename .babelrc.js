module.exports = {
  "presets": [
    ["@babel/preset-env", {
        "targets": {
          "node": "current",
        },
        debug: false,
    }],
  ],
  "plugins": [
    "@babel/plugin-transform-runtime",
    "@babel/plugin-proposal-class-properties",
    "@babel/proposal-export-default",
    ["@babel/plugin-proposal-decorators", {
      "legacy": true
    }],
    "@babel/plugin-proposal-optional-chaining",
    "@babel/plugin-proposal-export-default-from",
    ["module-resolver", {
      "alias": {
        "libs": "./source/libs",
        "plugins": "./source/plugins",
      }
    }]
  ],
};
