var gulp        = require('gulp'),
    /** Utilities */
    rename      = require('gulp-rename'),
    size        = require('gulp-filesize'),
    /** CSS */
    minifyCss     = require('gulp-minify-css'),
    autoprefixer  = require('gulp-autoprefixer'),
    /** Config */
    config      = require("../package.json");

/** Paths */
var paths = config.paths;

/**
 * CSS
 * @todo this seems kind of hasty. That may be because it's 1am. Investigate.
 */

module.exports = function buildCss () {

  return gulp.src(paths.css.dest + 'main.css')
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(minifyCss())
    .pipe(rename({ extname: '.min.css' }))
    .pipe(size())
    .pipe(gulp.dest(paths.css.dest));
};
