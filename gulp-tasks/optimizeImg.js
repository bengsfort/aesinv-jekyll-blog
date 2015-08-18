var gulp        = require('gulp'),
    /** Utilities */
    gutil       = require('gulp-util'),
    /** Images */
    imagemin    = require('gulp-imagemin'),
    pngquant    = require('imagemin-pngquant'),
    /** Config */
    config      = require("../package.json");

/** Paths */
var paths = config.paths;

/**
 * Images
 * @todo Determine better way of handling the inline SVG's so they can get optimized as well.
 */

gulp.task('optimize-img', function optimizeImg() {

  return gulp.src([paths.img.src + '*', paths.img.src + '**/*'])
    .pipe(imagemin({
      progressive: true,
      use: [pngquant({
        quality: '65-75'
      })]
    }))
    .pipe(gulp.dest(paths.img.dest));

});
