---
layout: post
title:  "Building a Gulp workflow wrapped around Jekyll"
date:   2015-8-29 17:16:21
category: development
tags:
  - gulp
  - jekyll
  - workflow
  - javascript
feature: gulp-feature.png
featureico: gulp-feature-icon.png
featurealt: A command prompt with the Jekyll build command and the Sublime Text editor with this sites project.
excerpt: An attempt at adding more dynamism to Jekyll via a workflow revamp using Gulp as a task runner and BrowserSync as a local server.
---

## Tl;dr
>- Jekyll is analog out of the box, a Gulp workflow allows you to simplify development massively.
>- Use either [child_process.spawn](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) or [child_process.exec](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback) to run the Jekyll build from Node/Gulp.
>- A way of sequencing your tasks is crucial to the build. I currently use [runSequence](https://www.npmjs.com/package/run-sequence) but am looking at refactoring.
>- View the [Completed Gulpfile](https://github.com/aesinv/aesinv-jekyll-blog/blob/master/gulpfile.js) on [GitHub](https://github.com/aesinv/aesinv-jekyll-blog/).

## The Problem
Out of the box, [Jekyll][] comes with everything you'd need to set up a simple, fully static website. When it comes time to add some dynamism however, things become quite analog. The default set up is very set in stone, and while you can add directories and files to include on compilation to your `_config.yml` file, if you want to delve into the realm of actual optimization of said included files you have to jump into _lots of pizza and a full night of Ruby_ land. As a front end developer with no previous experience in [Ruby][], this wasn't an appealing option for me (especially considering I can hardly stand even setting up [RVM][]).

Ideally then, this should be handled via a solid task manager such as [Gulp][] that would allow me to toss in any optimizations I'd like with minimal effort. While there are tons of [Yeoman](http://yeoman.io) generators out there, where's the fun in that?! Setting up a Gulp workflow is very straightforward and in some cases _quite fun_ (I'm not supposed to let people see me say that or something, right?), however the problem of how to get it to interact nicely with Jekyll persists.

## Determining what handles what
Since Jekyll spins up it's own build as well as a local development server and is required to generate the finished site, it's clearly necessary to determine what should be handling what. Since running the `jekyll serve` command in parallel with Gulp would wind up with the two stepping on each others toes, that idea quickly got thrown out the window in favor for Gulp handling the majority of the legwork while the Jekyll build would be reserved strictly for site generation.

So, let's start with what Jekyll can do right out of the box:

- [Sass][] compilation
- Markup / [Markdown][] / Data compilation and site generation
- Destination directory cleaning
- Copying project source directories and files that are marked for inclusion
- Spinning up a local dev server that auto re-gens on source file changes

Because Jekyll cleans the destination directory with each build and I'm not a huge fan of compiled build files hanging out and partying with source files, any extra tasks being handled by Gulp need to be run after the Jekyll build every time, with the built files then being injected into the build directory. Since Gulp will be handling the local server, there's no need to worry about that particular task. Additionally, to prevent requiring a full Jekyll/Asset re-build on simple stylesheet changes, that's another thing that we can transfer responsibility over to Gulp. Gulp can then handle tacking on some extra CSS stuff (such as [minification](https://www.npmjs.com/package/gulp-minify-css) and [auto prefixing](https://www.npmjs.com/package/gulp-autoprefixer)), as well as all JavaScript and image optimization.

## Scaffolding out the tasks
At this point, it's time to start scaffolding out exactly what needs to be built on a higher level so development is more focused on just writing some simple tasks rather than trying to determine what needs to be where and how _x_ should be called by _y_.

### Main utility tasks
We need some main utility tasks to handle all of the heavy lifting, so they can easily get called by the build tasks. Each one should handle all of the optimizations and subtasks for it's stated code type, that way the watch task can efficiently rebuild the portion of the code that's changed and not the entire build process.

- `buildJs`: Concatenate, lint, and minify all JavaScript
- `buildCss`: Take the built CSS, run it through the auto-prefixer, then minify
- `buildJekyll`: Utility function/task to run the Jekyll build
- `optimizeImg`: Run all images through [gulp-imagemin](https://www.npmjs.com/package/gulp-imagemin) for optimization
- `browser`: Initialize a [BrowserSync](http://browsersync.io) local server
- `browser:reload`: Reload our BrowserSync local server

### Helper/convenience tasks
Utility tasks out of the way, it would be useful to have some helper tasks that can batch the utility classes so the main build tasks and the watch stream aren't polluted with tons of individual task calls and complications.

- `build:assets`: Helper task to build, compile and optimize all site assets
  + `buildJs`
  + `buildCss`
  + `optimizeImg`
- `build`: Run the Jekyll build with the __config.yml_ file
  + `buildJekyll`
- `build:prod`: Same as `build`, but with the __config.build.yml_ file
  + `buildJekyll`

It's also worth noting that while the `build` and `build:prod` tasks may seem redundant, they're necessary as `buildJekyll` is more of a utility function rather than a task, and to build using a specific config file requires it to be called as a function. I generally build my gulp tasks out as normal [Node.js modules](https://darrenderidder.github.io/talks/ModulePatterns/#/) so they can exist independent of each other and be called normally. This is achieved by utilizing the [gulp-auto-task](https://www.npmjs.com/package/gulp-auto-task) module, an absolute must-use with Gulp.

### Main build tasks
Now that there are all of the tasks necessary to run builds, there needs to be some main build tasks that utilize our helpers and utilities to automate the entire proces for us.

- `serve`: Fire up a BrowserSync server, run a full site and asset build then watch for any changes.
  + `browser`
  + `build`
  + `build:assets`
  + `browser:reload` (on change)
- `deploy`: Run a full site and asset build, using the production config file.
  + `build:prod`
  + `build:assets`

## Building out the tasks
Since the workflows needs are pretty well laid out, the Gulp tasks can efficiently start being developed. I like to start out by scaffolding out the utility tasks/functions then creating the main build process. That way I can get all of my tasks working, then the main build tasks are just quick, batched task or function calls.

### Getting a testable Gulpfile set up
To make sure the tasks are easy to test, a very basic Gulpfile needs to be in place. Two must-use modules I use all the time and absolutely adore make super quick work of this: [gulp-auto-task](https://www.npmjs.com/package/gulp-auto-task) which automagically turns standard node modules into gulp tasks, and [require-dir](https://www.npmjs.com/package/require-dir) which will include all files within the specified folder, removing the possibility of having a giant mess of requires.

{% highlight javascript linenos %}
/** gulpfile.js */
var gulp          = require('gulp'),
    /** Utils */
    requireDir    = require('require-dir'),
    gulpAutoTask  = require('gulp-auto-task'),
    /** Config */
    paths        = require('./package.json').paths;

/** Import Main Tasks */
// Require modules so they can be called as functions
var utils = requireDir('gulp-tasks'); // ex. utils.buildJekyll();
// Automagically set up tasks
gulpAutoTask('{*,**/*}.js', {
  base: paths.tasks,
  gulp: gulp
});
{% endhighlight %}

Technically, `require-dir` is not necessary at this stage, but it's easy enough to include now and it saves having to include it later. With this in place, any _*.js_ files placed within the _./gulp-tasks/_ directory will not only get automatically required into the `utils` object, but they will also be turned into tasks without any `gulp.task` declarations. Some benefits to this include tasks becoming true modules, more readable files/file structure and **tasks become reusable**, which is very important for the Jekyll build task.

I'm also including a portion of _package.json_ that I use to hold all of my paths. One quirk to working with tasks that are spread across different files is that globals can very quickly become very repetitive, so to solve this and to stay __DRY__ I tossed a a `paths` object into my _package.json_ file, so I can just require that object directly and keep all of my paths in one place.

{% highlight json linenos %}
/** package.json */
{
  ...
  "paths": {
    "tasks": "gulp-tasks/",
    "src": "project/",
    "build": "_dist/",
    "bower": "bower_components/",
    "vendor": {
      "src": "project/js/lib/",
      "dest": "_dist/js/"
    },
    "js": {
      "src": "project/js/",
      "dest": "_dist/js/"
    },
    "sass": {
      "src": "project/_sass/"
    },
    "css": {
      "src": "project/css/",
      "dest": "_dist/css/"
    },
    "img": {
      "src": "project/img/",
      "dest": "_dist/img/"
    }
  },
  ...
}
{% endhighlight %}

### Utility Tasks
Since the Gulpfile is ready to accept tasks in the form of modules, the utility tasks can begin to take shape. As the modules are added they'll automatically be available to test via `gulp <fileName>`, which is extremely helpful from a testing standpoint. For the sake of progress, I like to start with the easiest ones to get them knocked out first and foremost; in this case that's the asset utilities as they are extremely simple and straight forward gulp tasks.

#### CSS Build
{% highlight javascript linenos %}
/** gulp-tasks/buildCss.js */
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

/** CSS Build */
module.exports = function buildCss () {

  return gulp.src(paths.css.src + 'main.scss')
    .pipe(sass({
      includePaths: [paths.sass.src] // Tell Sass where to look for files
    }).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(minifyCss())
    .pipe(rename({ extname: '.min.css' }))
    .pipe(size()) // Logs the minified file size to the console
    .pipe(gulp.dest(paths.css.dest));
};
{% endhighlight %}

The CSS task is a pretty straightforward, so there's not too much in it that's very special. There are two quirks that should be noted:

- Pass the path to the __sass/_ folder to the compiler so Sass knows where to look for files that get imported via `import();` (line 17)
- Surrender the handling of styles completely from Jekyll to avoid Sass compilation errors.

The former is easy enough and handled within our `sass()` function, but the latter requires messing with a couple more files.

- Tell Jekyll to exclude the _css/_ directory by adding it to the excludes array within the __config.yml_ file:
  {% highlight yaml %}
  exclude: [css/]
  {% endhighlight %}
- Remove the YAML front matter from the _main.scss_ file:
  {% highlight scss %}
  // ---
// # Only the main Sass file needs front matter (the dashes are enough)
// ---
  {% endhighlight %}

#### JavaScript Build
Again, there isn't really anything super special about the JavaSript build that differs from any other run-of-the-mill Gulp JavaScript builds. I gather the vendor files from my _js/lib_ directory and compile them to their own file, then similarly concatenate the regular _js/*.js_ files and build them together. Since Jekyll doesn't provide much in terms of JavaScript support out of the box, there's no extra configuration required.

{% highlight javascript linenos %}
/** gulp-tasks/buildJs.js */
var gulp        = require('gulp'),
  /** Utilities */
    rename      = require('gulp-rename'),
    size        = require('gulp-filesize'),
  /** JS Specific */
    jshint      = require('gulp-jshint'),
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
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
  // Minify files and rename
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(size())
    .pipe(gulp.dest(paths.js.dest));

};
{% endhighlight %}

#### Image Optimization
After having discovered the importance of image optimization while working at a marketing firm and embarking on a giant performance optimization crusade, I try to include it in all of my projects. Luckily, basic image optimization with gulp is a cake walk with [gulp-imagemin](https://www.npmjs.com/package/gulp-imagemin).
{% highlight javascript linenos %}
/** gulp-tasks/optimizeImg.js */
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
{% endhighlight %}
At this point I'm pretty happy with the results of the implementation on this site, however as noted in my @todo below I need to determine a better way of handling inline SVG's, which I currently have as includes. One option I've been considering is tossing all of my SVG's into __assets/svg_, then updating this task to minify and optimize all SVG's within that folder and toss them into my __includes/svg_ folder so they can easily be inlined via `{% raw %}{% include svg/icon-name.svg %}{% endraw %}`.

#### Jekyll Build
While the Jekyll build is the real meat and potatoes of the workflow, it's relatively simple and can be handled using one of two [child_process](https://nodejs.org/api/child_process.html) methods: [child_process.spawn](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) or [child_process.exec](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback).

Spawn and exec both do the same thing, but in different ways: spawn returns a stream, is asynchronously asynchronous and meant for streaming large amounts of data back to node, while exec returns a buffer and is synchronously asynchronous and meant for returning small data such as status messages. While both work, I personally prefer and am currently using exec for handling Jekyll builds.

**Jekyll Build using `child_process.exec`**
{% highlight javascript linenos %}
/** gulp-tasks/buildJekyll.js */
var exec          = require('child_process').exec,
    /** Utilities */
    gutil         = require('gulp-util');

// Gulp tasks get passed a callback first, so our secondary arg
// MUST be the second arg. Successful processes return callback(null).
module.exports = function buildJekyll(callback, env) {
  var cmd = 'jekyll build --config ';
  cmd += (env === 'prod' ? '_config.build.yml' : '_config.yml');

  // https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
  return exec(cmd, function(error, stdout, stderror) {
    gutil.log(stdout); // Log the output to the console
    return callback(error !== null ? 'ERROR: Jekyll process exited with code: '+error.code : null);
  });
};
{% endhighlight %}

**Jekyll Build using `child_process.spawn`**
{% highlight javascript linenos %}
/** gulp-tasks/buildJekyll.js */
var spawn         = require('child_process').spawn;

// Gulp tasks get passed a callback first, so our secondary arg
// MUST be the second arg. Successful processes return callback(null).
module.exports = function buildJekyll(callback, env) {
  var opts = ['build', '--config']; // add base opts

  // if `env` is 'prod', use the production config file
  opts.push(env === 'prod' ? '_config.build.yml' : '_config.yml');

  // Init the `jekyll` command with our `opts` array
  var jekyll = spawn('jekyll', opts, {
  // https://nodejs.org/api/child_process.html#child_process_options_stdio
    stdio: 'inherit' // use stdin, stdout, etc.
  });

  // Once finished, fire the Gulp callback
  return jekyll.on('exit', function(code) {
    return callback(code === 0 ? null : 'ERROR: Jekyll process exited with code: '+code);
  });
};
{% endhighlight %}

Having used both spawn and exec, I personally prefer exec due to the cleanliness and compactness of the resulting file and I've noticed better consistency with how quick the process has been ending, allowing the following queued tasks to start quicker.

### Helper and Convenience Tasks
With the utility tasks completed, the entire workflow could be emulated by manually running each task individually. As I don't think anyone is really interested in a workflow that would require you to manually run each task individually, some helper tasks are definitely in order to automate everything. These tasks can then be called either individually or by the main build tasks, keeping our main build tasks concise.

Since these helper tasks are pretty much exclusively batch task runners, they can just get tossed into the Gulpfile after the task importation.

{% highlight javascript linenos %}
/** gulpfile.js, cont */
/** Helper Tasks */
gulp.task('build', function(callback) {
  return utils.buildJekyll(callback, 'serve');
});

gulp.task('build:prod', function(callback) {
  return utils.buildJekyll(callback, 'prod');
});

gulp.task('build:assets', ['buildCss', 'buildJs', 'optimizeImg']);
{% endhighlight %}

On lines 3 - 5 the `build` task is getting declared, which just returns the `buildJekyll` utility function with the Gulp callback and non-`prod` environment passed in. On 7 - 9 the same is being done for the `build:prod` task but with the `prod` environment passed in as the second argument to dictate the use of the production build file. This duplication is a bummer, but it's unfortunately necessary so the environment can get passed in. Since the `buildJekyll` call is being returned and the completed buffer returns by calling the Gulp callback, the task is also able to be used in sequence which is very important while making the main build tasks.

On line 10 the `build:assets` call isn't anything super special, it's just a simple Gulp task that is calling all of our asset build tasks. This isn't super necessary but it's nice being able to call just one task rather than three whenever a full asset build needs to be run.

### Implementing BrowserSync
Since the entire build system is being handle by Gulp, it makes sense to have Gulp handle the local server as well. Rather than somehow hacking the the `jekyll serve` command into our watch command, tossing the blame to Gulp requires a lot less legwork; especially when integrating something like [BrowserSync][], which is my personal favorite. Not only is BrowserSync super easy to set up but it has some super cool features such as device syncing (which is incredibly fun to play with).

While the tasks being so small is reason enough to toss them into the Gulpfile after our helpers, the initialization of the server and the reload task need to be within the same file for them to know each other exist, making throwing these into the Gulpfile a necessity.

{% highlight javascript linenos %}
/** gulpfile.js, cont */
// BrowserSync needs to get required at the top of the file
var browserSync   = require('browser-sync').create('jekyll');

. . .

/** BrowserSync */
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
{% endhighlight %}

Luckily BrowserSync is super easy to implement, so there isn't a whole lot of bloat added to the Gulpfile. The module gets required and the server gets created with the name _Jekyll_, then the `browser` task actually initializes the server using the build path specified in the _package.json_ file and finally the `browser:reload` task takes the initialized server and sends it a notice to refresh. Piece of cake.

### Creating the Main Build tasks
So far all of the tasks required to actually fully build the site are completely scaffolded out, and the build could actually be used by manually running `gulp build && gulp build:assets` in the command line. That's all great, but personally I would find that super annoying, plus it wouldn't turn on the BrowserSync server. Since the whole point of this is complete automation, some build tasks are in order.

{% highlight javascript linenos %}
/** gulpfile.js, cont */
var watch         = require('gulp-watch'),
    runSequence   = require('run-sequence');

. . .

/** Main Builds */
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
{% endhighlight %}

The `gulp deploy` task (lines 45 - 47) is nothing special, so I won't really get into that as it's essentially that I mentioned in the first part of this section, just a batch task. The `gulp serve` task (lines 8 - 43) however looks like quite the stinker, especially due to my use of the [gulp-watch](https://www.npmjs.com/package/gulp-watch) module rather than the built in `gulp.watch` function; the former taking an endless stream approach, which I prefer.

#### The `gulp serve` task, explained
While the task looks like an absolute monster, it's actually pretty simple. On a very high level, it just sets up some listeners for each type of file that should trigger some sort of rebuild, and is broken down by type:

- CSS/Sass files which should trigger a style rebuild
- JavaScript files which should trigger a JS rebuild
- Images which should trigger image re-optimization
- Anything else which should trigger a full rebuild due to the Jekyll build cleaning the destination folder

As I said, pretty simple but there's one other quirk to the build that will almost certainly need a refactor with the release of Gulp 4 that I haven't explained yet, which is the [`runSequence` module](https://www.npmjs.com/package/run-sequence) that keeps getting called. Obviously there's a very specific order that needs to be called each time; if the other tasks fire and complete before the Jekyll build is complete, they'll be deleted by the Jekyll build and made pointless. This could be solved by adding some of the assets folders to the `excludes` within the __config.yml_ file, but I'd rather not have to toss in extra cleans in all of the builds and worry about extra artifacts sticking around and bloating up the built site.

RunSequence effectively forces tasks to run in sequence, so the queued tasks will not run until the first task is completed. This is why in all of the utility tasks the stream / callback is always getting returned, giving runSequence a reference of when one task ends so it can call the next task.

## To-do
Using runSequence to force things to run in order is a little bit of a hacky solution (it's even mentioned as a hack within the readme for the module) until [orchestrator](https://github.com/orchestrator/orchestrator), what Gulp is built off of, is updated to support [non-dependent ordered tasks](https://github.com/orchestrator/orchestrator/issues/21). This is supposed to make it into [Gulp 4](https://github.com/gulpjs/gulp/milestones), so once that's released I will definitely be refactoring this to be less hacky.

<div class="bg-video-wrap" style="background-image: url('/img/videos/gulpVid.png');">
  <video class="bg-video-player" autoplay loop>
    <source src="/img/videos/gulpVid.mp4"  type="video/mp4; codecs=avc1.42E01E,mp4a.40.2">
    <source src="/img/videos/gulpVid.webm" type="video/webm; codecs=vp8,vorbis">
    <source src="/img/videos/gulpVid.ogv"  type="video/ogg; codecs=theora,vorbis">
  </video>
</div>

## The Completed Workflow

With everything built, development is started by running `gulp serve`, which spins up a BrowserSync server and does a full Jekyll and asset build, then watches for any changes and automagically runs whatever builds are necessary to quickly reflect that change on the BrowserSync server. Once development is finished and something is ready to be deployed, `gulp deploy` can be run to run a full Jekyll and asset build, but using the __config.build.yml_ config file to get the correct URLs and build settings for production. This task only gets run by my server after I've pushed up a new commit to it, which I'll cover in a blog post later although there are many posts already in reference to this (such as [this one](https://www.digitalocean.com/community/tutorials/how-to-deploy-jekyll-blogs-with-git) on [Digital Ocean](digitalocean.com)).

You can find all of the completed files referenced in this post in the [GitHub repository](https://github.com/aesinv/aesinv-jekyll-blog/) for this site.

[browsersync]: http://browsersync.io
[Gulp]: http://gulpjs.com/
[Jekyll]: http://jekyllrb.com/
[markdown]: http://daringfireball.net/projects/markdown/
[node.js]: https://nodejs.org/
[Ruby]: https://www.ruby-lang.org/en/
[RVM]: https://rvm.io/
[sass]: http://sass-lang.com/
[Yaml]: http://yaml.org/
