---
layout: post
title:  "Building a Gulp workflow wrapped around Jekyll"
date:   2015-8-19 12:16:21
category: development
tags:
  - gulp
  - jekyll
  - workflow
  - javascript
feature: launch-post-feature.png
featureico: launch-post-feature-icon.png
featurealt: A command prompt with the jekyll build command and the Sublime Text editor with this sites project.
excerpt: An attempt at adding more dynamism to Jekyll via Gulp and friends.
---

## The Problem
Out of the box, [Jekyll][] comes with everything you'd need to set up a simple, fully static website; however when it comes time to add some dynamism things become quite analog. The default set up is very set in stone, and while you can add directories and files to include on compilation to your `_config.yml` file, if you want to delve into the realm of actual optimization of said included files you have to jump into _lots of pizza and a full night of Ruby_ land. As a front end developer with no previous experience in [Ruby][], this wasn't an appealing option for me (especially considering I can hardly stand even setting up [RVM][]).

Ideally, this would be handled via a solid [Gulp][] setup that would allow me to toss in any optimizations I'd like with minimal effort, considering it's a platform I'm very familiar with and use all the time. While setting up a Gulp workflow is very straightforward and in some cases quite fun, the problem of how to get it to interact nicely with Jekyll persists.

## Determining what handles what
Since Jekyll spins up it's own build as well as a local development server and is required to generate the finished site, it was clearly necessary to determine what should be handling what. Since running the `jekyll serve` command in parallel with Gulp would wind up with the two stepping on each others toes, that idea quickly got thrown out the window in favor for Gulp handling the majority of the legwork while the Jekyll build would be reserved strictly for site generation.

This however caused an issue: out of the box, Jekyll builds the styles from Sass and requires Yaml

So, let's start with what Jekyll handles out of the box

- Sass compilation
- Markup / Markdown / Data compilation and site generation
- A local server environment

That's all great, but I'd like a little bit more functionality. Let's now look at a complete list of the desired build functionality, and see what can to be supplemented by Gulp.

- Sass compilation
- Style auto-prefixing and minification
- JavaScript concatenation and minification
- Automagic image optimization
- <del>Markup / Markdown / Data compilation and site generation</del>
- A local server environment

So, out of all of those there is only one task

[Gulp]: http://gulpjs.com/
[Jekyll]: http://jekyllrb.com/
[Ruby]: https://www.ruby-lang.org/en/
[RVM]: https://rvm.io/
