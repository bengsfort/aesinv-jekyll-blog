---
layout: post
title:  "Creating a static templates file with Handlebars template precompilation"
date:   2016-5-26 15:02:30
category: development
tags:
  - javascript
  - handlebars
  - aem
  - gulp
feature: git-timeout/feature.png
featureico: git-timeout/thumbnail.png
featurealt: The trauma. The despair.
excerpt: Who wants to deal with AJAX or script tags just so you can show a template!??! Let's take a dive into template precompilation so you don't have to go down that dark path.
---

So you're super hyped because you're going to toss Handlebars into your project for some wicked templating... But, you aren't using any bundlers like [Webpack](https://webpack.github.io/) or [Browserify](http://browserify.org/) so you can't really take advantage of easily bundling those templates into your source. No biggie! Before you resort to firing off an AJAX request to snag those templates or tossing them into a script tag somewhere, let me help you take a dive into the world of template precompilation so you can emulate that bundling functionality and continue [crushing it](https://www.youtube.com/watch?v=TKQyPfN6s88).

## The alternatives

So before we jump into it, what are the alternatives in this situation? Well, there are two things that need to happen before you can actually use a Handlebars template (or any other templating system for that matter):

1. You need to get the templates source code to the browser
2. The source code needs to be compiled into a usable template

The second of those is going to be the same regardless of which route you go, so lets focus on that first one. We've got two options here, either firing off a GET request to snag the source code of your template or having your template live inside of a `<script></script>` tag on your page. An AJAX request is a major bummer because that's one more request that needs to happen before the content can even be displayed, which is pretty brutal if the content needs to be displayed on page load. Script tags can arguably work just fine; the only downside is that your template is now tied to whatever file you've got your main markup in and you also have to inject a script tag right in the middle of your markup.

From a user experience point of view the latter of these options is definitely the better of the two, and is also suggested by the [Handlebars](http://handlebarsjs.com) website. But, before you go tossing a bunch of script tags into your markup let's scope out precompilation.

## The idea

Precompilation is exactly what the name suggests: it's compiling your templates before they even get to the browser. The benefits of this are that your templates are ready to go when you need them without compilation within the browser, which garner significant performance savings especially when combined with the fact that you can also run a smaller required runtime library.

_"Dope! That sounds rad! But I'm not using any bundlers, so how can I get my templates precompiled? Do I have to manually do it before builds? If so that sucks."_  Totally agree. That would be a major buzz kill. That would be the case, but luckily task runners like [Gulp](http://gulpjs.com/) exist and can come save the day by allowing us to find handlebar templates within our project, precompile them and finally inject them into a file that gets included in our main JS build.

### The Steps

Here is a quick outline of the steps we will take to accomplish this, then we'll jump right into it.

1. Create a JS template file
2. Add a Handlebars task to our Gulp build
3. Add Handlebars templates
4. Go have a beer

## Creating a JS Template file

The JS template file will be used as our template to hold our templates. I know that sounds weird, but trust me on this. It's going to be a JS file that we inject pre-compiled templates into, which then get exposed to the rest of our project via a global object. Let's jump right on in!

{% highlight javascript linenos %}
{% raw %}
// /gulp-tasks/templates/namespace.templates.js
/**
 * NOTICE:
 * Do not change this file directly, it gets automatically generated
 * by the `gulp templates:precompile` task.
 */

(function(document, window) {
    window.namespace = window.namespace || {};
    window.namespace.Templates = {};

    // Store all of our raw precompiled templates
    var precompiledTemplates = {
        {{#each items}}
            '{{name}}': {{{tmpl}}},
        {{/each}}
    };

    // Iterate through the precompiled templates and run them through
    // Handlebars' template initialization function, storing them in
    // our global namespace on completion.
    for (var tmpl in precompiledTemplates) {
        window.namespace.Templates[tmpl] = Handlebars.template(precompiledTemplates[tmpl]);
    }
})(document, window, null);
{% endraw %}
{% endhighlight %}

There isn't anything super special with this file, essentially all we're doing is creating an object within our projects global namespace that we can store each one of the precompiled templates in, that way they are accessible from any other script within our project by accessing that object. First we store them in a locally-scoped object (lines 13 - 17), then we iterate over that object and inject the initialized templates into our global namespace (lines 22 - 24).

I chose to use Handlebars with this file since, well, we're already using it in our project; but you can use any templating setup you want to achieve the same thing. We'll get into the `items` array in our next step.

## Creating a precompilation gulp task

Now that we have our JS template, we need to wire it up to work with our build. In this instance, we're going to assume the following:

1. You have a Gulp build integrated into your project
2. You are using some sort of JS concatenation setup

Let's get cracking and check out the task!

{% highlight javascript linenos %}
var gulp       = require('gulp'),
    Handlebars = require('handlebars'),
    // utils
    fs         = require('fs'),
    glob       = require('glob');

gulp.task('templates:precompile', function (cb) {
    var sourceTemplate, templateObjects,
        jsTemplateSourcePath = '/gulp-tasks/templates/namespace.templates.js',
        templatePath = 'path/to/templates/**/*.hbs',
        compiledDestination = '/path/to/scripts/templates.js';

    // Read and compile our JS template file into a usable template
    // before handling any sort of file pre-compilation
    sourceTemplate = Handlebars.compile(
        fs.readFileSync(jsTemplateSourcePath, {
            encoding: 'utf8'
        })
    );

    // Use glob to find all of our handlebars templates
    glob(templatePath, function (err, files) {
        if (err) throw Error(err);
        var precompiledTemplateFile, stream;

        // Iterate through each of the files found and generate an
        // array of items containing the filename and the precompiled
        // Handlebars template.
        templateObjects = files.map(function (file) {
            var hbsFile = fs.readFileSync(file, { encoding: 'utf8' }),
                filename = file.split('/').pop();

            return {
                name: filename.slice(0, filename.indexOf('.')),
                tmpl: Handlebars.precompile(hbsFile)
            };
        });

        // Pass all of our precompiled templates to our JS template and store the result
        precompiledTemplateFile = sourceTemplate({items: templateObjects});

        // Open up a stream to create a new file containing the result of our
        // template precompilation.
        stream = fs.createWriteStream(process.cwd()+compiledDestination);

        // Write the result of our precompilation to the stream
        stream.write(precompiledTemplateFile);
        stream.end();

        // Fire the Gulp callback on completion so the next task can start
        stream.on('finish', function () {
            console.log('Template file successfully generated.');
            cb();
        });
    });
})
{% endhighlight %}

Aaaaand breathe. Phew. Lets go over what we just did:

1. **Lines 15 - 19**: First we have to read our JS Handlebars template as a string and pipe that into Handlebars for compilation into a ready-to-use Handlebars template.
2. **Lines 22 - 55**: We use [glob](https://www.npmjs.com/package/glob) to easily find all of our Handlebars templates using a glob pattern. It's important to note that this returns an array of file paths.
3. **Lines 29 - 37**: We iterate through the discovered files and create an array of objects containing the filename without any path or extension and the precompiled template generated from the template source.
4. **Line 40**: We then pass the fancy array we created in the previous step to our compiled template file so it can inject all of those templates into the global object in that template. We store the result of this to use it when writing our new file.
5. **Lines 44 - 54**: After the template has been generated, we take it and create a new file using a write stream. On completion, we let the console know that everything was successful and we fire the callback passed into the Gulp task so the next task knows it can start.

From there, you can run your javascript concatenation to get the file into your built JS; or, if you're on a platform such as AEM and are taking advantage of client library concatenation, you can just toss the built template file into your `js.txt` file so it gets included in your client library. Now you're ready to create some templates!

## Create Handlebars templates!

Now if you create some handlebars templates in the path you used for your template glob and run the gulp task we just added, you'll wind up with a `templates.js` file that contains all of your templates within a global object that you can access super easily from anywhere else in your javascript. For example:

{% highlight handlebars %}
{% raw %}
<!-- linklist.hbs -->
<div class="link-list">
    <h2>{{ title }}</h2>
    <p class="lead">{{ lead }}</p>
    <ul>
        {{#each items}}
            <li><a href="{{{ link }}}">{{ label }}</a></li>
        {{/each}}
    </ul>
</div>
{% endraw %}
{% endhighlight %}

Can then be accessed by:

{% highlight javascript %}
// linklist.js
var markup = window.namespace.Templates.linklist({
    title: 'Link List',
    lead: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    items: [
        { link: '/link', label: 'Item Label' }
    ]
});

linkListContainer.textContent(markup);
{% endhighlight %}

To generate and inject:

{% highlight html %}
<div class="link-list">
    <h2>Link List</h2>
    <p class="lead">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    <ul>
        <li><a href="/link">Item Label</a></li>
    </ul>
</div>
{% endhighlight %}

Is that worthy of starting beer time?
