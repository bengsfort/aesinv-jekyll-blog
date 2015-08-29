var gulp        = require('gulp'),
    /** Utilities */
    rename      = require('gulp-rename'),
    size        = require('gulp-filesize'),
    /** CSS */
    sass          = require('gulp-sass'),
    minifyCss     = require('gulp-minify-css'),
    autoprefixer  = require('gulp-autoprefixer'),
    /** Config */
    paths      = require("../package.json").paths;

/**
 * CSS
 * @todo this seems kind of hasty. That may be because it's 1am. Investigate.
 */

module.exports = function buildCss () {

  return gulp.src(paths.css.src + 'main.scss')
    .pipe(sass({
      includePaths: [paths.sass.src]
    }).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(minifyCss())
    .pipe(rename({ extname: '.min.css' }))
    .pipe(size())
    .pipe(gulp.dest(paths.css.dest));
};
