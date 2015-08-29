---
layout: post
title:  "Gulp Workflow @todo"
date:   2015-8-29 14:44:40
category: development
tags:
  - gulp
  - jekyll
  - workflow
  - javascript
feature: gulp-feature.png
featureico: gulp-feature-icon.png
featurealt: A command prompt with the Jekyll build command and the Sublime Text editor with this sites project.
excerpt: @todos for gup workflow
---

I am also looking into a refactor implementing [lazypipe](https://www.npmjs.com/package/lazypipe) and using the tasks as pipe-able modules, so I can control and fire off the functions in the right order through the pipeline, without having to hack a sequence order. I'm currently unsure if this will work, but it's worth a shot to try it out and see if it works.

{% highlight javascript %}
/** Proposed implementation */
gulp.task('build:prod', function() {
  return gulp.src('_config.yml')
    .pipe(buildJekyll()) //
    .pipe(buildAssets())
    .pipe(gulp.dest('. . .'));
});
{% endhighlight %}

Part of me also feels as though this is a little bit hackier than the original implementation due to this option taking advantage of the pipeline to modify other files. With the fact that whenever you read any questions regarding sequenced task running in Gulp issues on Github you just get a bunch of responses saying that it's against why Gulp was made, perhaps another solution may be to take a different approach entirely with eliminating _gulp-auto-task_ and writing a sequenced function-runner, leaving the only tasks as the build tasks:

{% highlight javascript %}
/** Working POC code */
/** Helper Tasks */
var runTasks = function runTasks(array) {
  // Pass initial args to self-executing recursive return function
  return (function runTask(task, index, arr) {
    if (arr.length === array.length) return arr;

    gutil.log('Running task '+gutil.colors.red(task));

    var results = task();

    // If a stream errors, throw a new error to the console
    results.on('error', function(error) {
      throw new Error("There was an error: "+error);
    });

    // Once task completes, tell the returned array and recursively run again
    results.on('end', function() {
      arr.push(true);
      gutil.log('Task '+gutil.colors.red(task)+' completed.');
      runTask(array[index + 1], index + 1, arr);
    });
  })(array[0], 0, []);
};

var build = function build(callback) {
  return utils.buildJekyll(callback, 'serve');
};

var buildProduction = function buildProduction(callback) {
  return utils.buildJekyll(callback, 'prod');
};

var buildAssets = function buildAssets() {
  return runTasks(['utils.buildCss', 'utils.buildJs', 'utils.optimizeImg']);
};

// Ex. watch html/markdown callback
build({
  // Functions within get fired ONLY when `build` finishes
  buildAssets();
  browserSync.reload();
});

// Ex. Deploy task
gulp.task('deploy', function() {
  runTasks(['buildProduction', 'buildAssets']);
});
{% endhighlight %}