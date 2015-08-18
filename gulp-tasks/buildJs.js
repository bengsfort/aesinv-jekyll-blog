var gulp        = require('gulp'),
  /** Utilities */
    gutil       = require('gulp-util'),
    rename      = require('gulp-rename'),
    size        = require('gulp-filesize'),
  /** JS Specific */
    jshint      = require('gulp-jshint'),
    concat      = require('gulp-concat'),
    uglify      = require('gulp-uglify'),
/** Config */
    config      = require('../package.json');


/** Paths */
var paths = config.paths;

/**
 * JavaScript
 * @todo Extract this to be more dynamic, helper function, specify path, file name, and what tasks to execute.
 */

gulp.task('build-js', function buildJs() {

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
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
  // Minify files and rename
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(size())
    .pipe(gulp.dest(paths.js.dest));
});
