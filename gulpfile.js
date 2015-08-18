var gulp        = require('gulp'),
    spawn       = require('child_process').spawn,

    /** Utils */
    watch       = require('gulp-watch'),
    browserSync = require('browser-sync').create(),
    requireDir  = require('require-dir'),
    argsv       = require('yargs').argsv,
    runSequence = require('run-sequence'),
    gutil       = require('gulp-util'),

    /** Config */
    config = require('./package.json');

var paths = config.paths;

/** Import Main Tasks */
var tasks = requireDir('gulp-tasks');

/** Helper Utils*/
var buildJekyll = function buildJekyll(env, callback) {
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

/** Helper Tasks */
gulp.task('build', function(callback) {
  return buildJekyll('serve', callback);
});

gulp.task('build-prod', function(callback) {
  return buildJekyll('prod', callback);
});

gulp.task('build-assets', ['build-css', 'build-js', 'optimize-img']);

/**
 * BrowserSync
 */
// Init server to build directory
gulp.task('browser-sync', function() {
  browserSync.init({
    server: "./" + paths.build,
  });
});

// Force reload
gulp.task('browser-reload', function() {
  browserSync.reload();
});

/**
 * Main Builds
 */
gulp.task('serve', ['browser-sync'], function() {
  runSequence('build', ['build-assets']);

  watch([
        paths.src +'fonts/*',
        paths.sass.src +'*.scss',
        paths.css.src +'main.scss',
        paths.sass.src +'**/*.scss',
  ], function() {
    runSequence('build', ['build-assets', 'browser-reload']);
  });

  watch([paths.js.src +'*.js', paths.vendor.src +'*.js'], function() {
    gulp.start('build-js', ['browser-reload']);
  });

  watch([paths.img.src +'*', paths.img.src +'**/*'], function() {
    gulp.start('optimize-img', ['browser-reload']);
  });

  watch([
        paths.src +'*',
        paths.src +'_data/*',
        paths.src +'_plugins/*',
        paths.src +'**/*.md',
        paths.src +'**/*.html',
        paths.src +'**/*.markdown',
        paths.src +'_includes/**/*.md',
        paths.src +'_includes/**/*.svg',
        paths.src +'_includes/**/*.html',
  ], function() {
    runSequence('build', ['build-assets', 'browser-reload']);
  });
});

gulp.task('deploy', function() {
  runSequence('build-prod', ['build-assets']);
});
