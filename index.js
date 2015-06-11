var fs = require('fs');
var path = require('path');
var through = require('through');
var FileSystemLoader = require('css-modules-loader-core/lib/file-system-loader');

var cssExt = /\.css$/;
module.exports = function (browserify, options) {
  options = options || {};

  var cssOutFilename = options.output || options.o;
  if (!cssOutFilename) {
    throw new Error('css-modulesify needs the --output / -o option (path to output css file)');
  }

  var cssOut = through();
  cssOut.pipe(fs.createWriteStream(cssOutFilename));

  var filenames = [];
  browserify.transform(function transform (filename) {
    // only handle .css files
    if (!cssExt.test(filename)) {
      return through();
    }

    // collect visited filenames
    filenames.push(filename);

    return through(function noop () {}, function end () {
      var self = this;

      var loader = new FileSystemLoader(path.dirname(filename));
      loader.fetch(path.basename(filename), '/').then(function (tokens) {
        var output = "module.exports = " + JSON.stringify(tokens);

        cssOut.queue(loader.finalSource);

        self.queue(output);
        self.queue(null);
      }, function (err) {
        console.error(err);
      });
    });
  });

  // wrap the `bundle` function
  var bundle = browserify.bundle;
  browserify.bundle = function (opts, cb) {

    // call the original
    var stream = bundle.apply(browserify, arguments);

    // close the css stream
    stream.on('end', function () {
      cssOut.queue(null);
    });

    return stream;
  };

  return browserify;
};
