var gulp        = require('gulp'),
  /** Utilities */
    rename      = require('gulp-rename'),
    size        = require('gulp-filesize'),
  /** JS Specific */
    eslint      = require('gulp-eslint'),
    concat      = require('gulp-concat'),
    uglify      = require('gulp-uglify'),
/** Config */
    paths      = require('../package.json').paths;

/**
 * JavaScript
 * @todo Extract this to be more dynamic, helper function, specify path, file name, and what tasks to execute.
 */

module.exports = function buildJs() {

  // Build vendor files
  gulp.src(paths.vendor.src + '*.js')
  // Concat files
    .pipe(concat('vendor.js'))
  // Minify combined files and rename
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(size())
    .pipe(gulp.dest(paths.vendor.dest));

  return gulp.src(paths.js.src + '*.js')
  // Concat files
    .pipe(concat('main.js'))
  // Lint file
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
  // Minify files and rename
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(size())
    .pipe(gulp.dest(paths.js.dest));

};
