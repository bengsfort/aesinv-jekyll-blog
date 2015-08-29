/**
 * Main gulpfile for aesinv.com, my Jekyll blog
 * @todo: see `modular-gulpfile.js` - TO BE MOVED TO SEPARATE BRANCH
 */

var gulp          = require('gulp'),

    /** Utils */
    watch         = require('gulp-watch'),
    browserSync   = require('browser-sync').create('jekyll'),
    requireDir    = require('require-dir'),
    runSequence   = require('run-sequence'),
    gutil         = require('gulp-util'),
    gulpAutoTask  = require('gulp-auto-task'),

    /** Config */
    paths        = require('./package.json').paths;

/** Import Main Tasks */
// Require them so they can be called as functions
var utils = requireDir('gulp-tasks');
// Automagically set up tasks
gulpAutoTask('{*,**/*}.js', {
  base: paths.tasks,
  gulp: gulp
});

/** Helper Tasks */
gulp.task('build', function(callback) {
  return utils.buildJekyll(callback, 'serve');
});

gulp.task('build:prod', function(callback) {
  return utils.buildJekyll(callback, 'prod');
});

gulp.task('build:assets', ['buildCss', 'buildJs', 'optimizeImg']);

/**
 * BrowserSync
 */
// Init server to build directory
gulp.task('browser', function() {
  browserSync.init({
    server: "./" + paths.build,
  });
});

// Force reload across all devices
gulp.task('browser:reload', function() {
  browserSync.reload();
});

/**
 * Main Builds
 */
gulp.task('serve', ['browser'], function() {
  runSequence('build', ['build:assets']);
  // CSS/SCSS
  watch([
        paths.src +'fonts/*',
        paths.sass.src +'*.scss',
        paths.css.src +'main.scss',
        paths.sass.src +'**/*.scss',
  ], function() {
    runSequence('buildCss', ['browser:reload']);
  });
  // JS
  watch([paths.js.src +'*.js', paths.vendor.src +'*.js'], function() {
    runSequence('buildJs', ['browser:reload']);
  });
  // Images
  watch([paths.img.src +'*', paths.img.src +'**/*'], function() {
    runSequence('optimizeImg', ['browser:reload']);
  });
  // Markup / Posts/ Data
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
    runSequence('build', ['build:assets', 'browser:reload']);
  });

  gutil.log('Watching for changes.');
});

gulp.task('deploy', function() {
  runSequence('build:prod', ['build:assets']);
});
