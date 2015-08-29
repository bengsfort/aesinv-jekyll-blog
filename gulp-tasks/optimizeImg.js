var gulp        = require('gulp'),
    /** Images */
    imagemin    = require('gulp-imagemin'),
    pngquant    = require('imagemin-pngquant'),
    /** Config */
    paths      = require("../package.json").paths;

/**
 * Images
 * @todo Determine better way of handling the inline SVG's so they can get optimized as well.
 */

module.exports = function optimizeImg() {

  return gulp.src([paths.img.src + '*', paths.img.src + '**/*'])
    .pipe(imagemin({
      progressive: true,
      use: [pngquant({
        quality: '65-75'
      })]
    }))
    .pipe(gulp.dest(paths.img.dest));

};
