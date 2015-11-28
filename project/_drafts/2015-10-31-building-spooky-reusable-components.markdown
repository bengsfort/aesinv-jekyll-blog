---
layout: post
title:  "The Do's and Don'ts of efficient reusable components"
date:   2015-10-31 8:53:03
category: development
tags:
  - AEM
  - React
  - sightly
  - handlebars
  - php
  - templating
  - reusable components
feature: gulp-feature.png
featureico: gulp-feature-icon.png
featurealt: A command prompt with the Jekyll build command and the Sublime Text editor with this sites project.
excerpt: Reusable components within your templating can be incredibly useful, but if they're not thought out correctly they can be a constant source of defects, regression, difficult maintainability and annoyance. Here are some ways I've found that reduce those maintenance troubles.
---

You hear a lot of talk within the web world about _components_, especially if you work with a platform like [AEM](http://www.adobe.com/marketing-cloud/enterprise-content-management.html) or [React](https://facebook.github.io/react/). The whole premise behind components are that they're reusable UI widgets/snippets (had to try and think of a word other than components there) that simplify development by promoting the <abbr>DRY<span class="abbr-tooltip">Don't Repeat Yourself</span></abbr> concept, and allow the developer to build a foundation of reusable code that can in turn be used to build bigger and more complex functionalities more efficiently. Components can be anything from a humble button to a massive header with meganav functionality, the former being more of a building block while the latter would be more of a widget built from building blocks.

While reusable components can be incredibly useful, they can also become a major headache and a source of context issues if they are not planned correctly. This post is a compilation of tips to make sure you're maximizing reusable component efficiency and avoiding the headaches that come with asking a template to do too much.

## Our component
For this post we'll be using a very common piece of functionality, a multipurpose card that can be grouped together into a grid or standalone in a rail or smaller column. For the sake of maximum reusability, we'll be using the same component for both vertically-oriented and horizontally-oriented styles for the card.
