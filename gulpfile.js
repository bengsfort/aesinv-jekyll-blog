var gulp          = require('gulp'),
    spawn         = require('child_process').spawn,

    /** Utils */
    watch         = require('gulp-watch'),
    browserSync   = require('browser-sync').create('jekyll'),
    requireDir    = require('require-dir'),
    runSequence   = require('run-sequence'),
    gutil         = require('gulp-util'),
    gulpAutoTask  = require('gulp-auto-task'),

    /** Config */
    config        = require('./package.json');

var paths = config.paths;

/** Import Main Tasks */
// Require them so they can be called as functions
var utils = requireDir('gulp-tasks');
// Automagically set up tasks
gulpAutoTask('{*,**/*}.js', {
  base: './gulp-tasks',
  gulp: gulp
});

/** Helper Tasks */
gulp.task('build', function(callback) {
  return utils.buildJekyll(callback, 'serve');
});

gulp.task('build-prod', function(callback) {
  return utils.buildJekyll(callback, 'prod');
});

gulp.task('build-assets', ['buildCss', 'buildJs', 'optimizeImg']);

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
    gulp.start('buildJs', ['browser-reload']);
  });

  watch([paths.img.src +'*', paths.img.src +'**/*'], function() {
    gulp.start('optimizeImg', ['browser-reload']);
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
