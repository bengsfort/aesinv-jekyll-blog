var spawn         = require('child_process').spawn,
    /** Utilities */
    gutil         = require('gulp-util');

module.exports = function buildJekyll(callback, env) {
  var opts = ['build', '--config'];
  gutil.log('Running Jekyll build.');

  if (env === 'prod') opts.push('_config.build.yml');
  else opts.push('_config.yml');

  var jekyll = spawn('jekyll', opts, {
    stdio: 'inherit'
  });

  return jekyll.on('exit', function(code) {
    return callback(code === 0 ? null : 'ERROR: Jekyll process exited with code: '+code);
  });
};