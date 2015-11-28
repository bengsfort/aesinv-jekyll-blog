---
layout: post
title:  "Building a simple JavaScript game - 1. A basic world"
date:   2015-11-27 9:45:48
category: development
tags:
  - javascript
  - games
  - game development
  - dungeon crawler
feature: launch-post-feature.png
featureico: launch-post-feature-icon.png
featurealt: The start of our fantastic vidja-game.
excerpt: Playing video games are fun. JavaScript is fun. So..... Why not both? In this episode, we'll be building a basic world and foundation.
---

Once I started getting into web development my desire to be a game developer got put on the back burner while I continued to explore and build my skills as a web developer. As my experience grew and I began to understand the underlying concepts behind what makes a game it started to come back around again, but instead of using traditional languages I've been having a lot of fun experimenting with video game development with JavaScript.

There are plenty of existing libraries and foundations for JavaScript game development you can build off of ([Phaser](http://phaser.io/), [Unity](http://unity3d.com/), [Kiwi](http://www.kiwijs.org/), [PlayCanvas](https://playcanvas.com/)), my personal favorite being Unity. However, there is a certain charm and satisfaction that comes from building something from scratch. If you're looking to jump right into build a crazy 3D cross-platform behemoth I'd certainly suggest checking out some of the frameworks/engines referenced above, but for the sake of a great educational exercise, we'll be building a simple little top-down game from scratch.

Before we continue, I'd just like to mention that throughout the writing and development of this simple game I'm going to be listening to a live performance from the Legend of Zelda: Symphony of the Goddesses to really get into the spirit of the project. I highly recommend you fire it up and do the same, it's terrific!

<iframe width="640" height="360" src="https://www.youtube.com/embed/Vbfc3HAOw7o?rel=0" frameborder="0" allowfullscreen></iframe>

## High-level overview

We're going to be making a simple top-down game with basic old-school gameplay characteristics. The finished product will allow us to walk around a small town, go in buildings, and fight baddies just outside the town. As the character moves, the camera will remain still until it either gets to the edge of the viewport or moves within a _door tile_. When these two events occur, the camera will either move to display the next portion of the world or the player will be transported into a new room (whatever the door leads to), respectively.

We'll be using the [HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) to handle rendering our game, and we'll be developing our JavaScript with the help of [Gulp](http://gulpjs.com/), [Browserify](http://browserify.org/), and [Browser Sync](http://www.browsersync.io/). In terms of managing what's going on within the game, we'll be attaching state objects to all of our different components so we can manage the current state of each component individually, which I personally find to be the easiest method of monitoring and managing data.

I've completed a basic project boilerplate you can download and follow along with, available on [Github](https://github.com/aesinv/javascript-game-demo/releases/tag/0.1.0-boilerplate). Alternatively, you can visit the [repository](https://github.com/aesinv/javascript-game-demo/) for the demo and just checkout commit 3a4f588. If you'd like a more in-depth look at setting up Gulp for projects, you can check out a [previous post]({% post_url 2015-8-29-building-a-gulp-workflow-around-jekyll %}) that goes over building a gulp file for Jekyll pretty thoroughly.

## Getting started

Our first order of business will be creating a good project foundation. We could build this entire thing in a single monstrous file, but for the sake of readability and maintainability I'm more a fan of modularity, which is why I've opted to build out the game and its components as modules then bundle them together via [browserify](http://browserify.org/). Let's have a look at our proposed project structure:


    index.html /* Loads up game module for game-playing party time. */
    /js/ /* Main JS root. */
    - game.js /* Primary game module. Will instantiate and manage all secondary modules. */
    - players/ /* Contains all enemy/character-related modules. */
    - utils/ /* Contains global constants/utility functions. */
    - world/ /* Contains the main world classes and all levels */


It's a pretty simple structure, and should be fairly predictable. Our main `game.js` file will require the proper modules from `players/`, `utils/`, and `world/` as dependencies, which will in turn require any additional dependencies needed to generate our game. In this part we'll more than likely only touch one (maybe two) files in each directory.

### Creating a viewport with canvas

First things first, we want to create our main game module so we can start working. Then, we'll include that on our html page and have it dynamically inject a high-dpi, or high resolution, canvas onto the page after calculating the correct pixel ratio; this way we can make sure we'll have crystal clear rendering even on higher pixel density devices.

Let's start with that first bit by creating a bare-bones game module inside of `/js/game.js`.
{% highlight javascript linenos %}
// /js/game.js
var $container = document.getElementById('container');

// Create base game class
function Game() {
    this.viewport = document.createElement('canvas');
    this.context = viewport.getContext('2d');

    this.viewport.width = 800;
    this.viewport.height = 600;

    // Append the canvas node to our container
    $container.insertBefore(this.viewport, $container.firstChild);

    // Toss some text into our canvas
    this.context.font = '32px Arial';
    this.context.fillText('It\'s dangerous to travel this route alone.', 5, 50, 800);

    return this;
}

// Instantiate the game in a global
window.game = new Game();

// Export the game as a module
module.exports = game;
{% endhighlight %}

We're not doing anything fancy here, just creating a canvas (6 - 10), tossing it into our container (13), then rendering some text (16 - 17). More than likely if you view the above code on a high pixel density monitor it will output the text but it will be _super_ blurry and gross. To solve this, we're going to create a utility that will calculate the correct pixel ratio then downscale the canvas for optimum rendering quality. We're going to be basing our utilities off of a terrific [HTML5 Rocks blog post](http://www.html5rocks.com/en/tutorials/canvas/hidpi/) on the subject, and tossing them into our handy-dandy `utils/` directory under the file name `utils.canvas.js`.

Just a note, but our utility files will be extremely simple exports of object literals contained with methods, so you can expect them to follow a structure like so:

{% highlight javascript %}
// /js/utils/utils.canvas.js
module.exports = {
    methodOne: function () {},
    methodTwo: function () {}
};
{% endhighlight %}

First, we'll need a way to get the correct pixel ratio. To do this we're going to need a canvas context, which we'll use to get the device backing ratio from the backing device backing store. We'll then divide the pixel ratio from the window by that backing ratio, giving us our pixel ratio.

{% highlight javascript linenos %}
    // /js/utils/utils.canvas.js

    /** Determine the proper pixel ratio for the canvas */
    getPixelRatio : function getPixelRatio(context) {
      console.log('Determining pixel ratio.');

      // I'd rather not have a giant var declaration block,
      // so I'm storing the props in an array to dynamically
      // get the backing ratio.
      var backingStores = [
        'webkitBackingStorePixelRatio',
        'mozBackingStorePixelRatio',
        'msBackingStorePixelRatio',
        'oBackingStorePixelRatio',
        'backingStorePixelRatio'
      ];

      var deviceRatio = window.devicePixelRatio;

      // Iterate through our backing store props and determine the proper backing ratio.
      var backingRatio = backingStores.reduce(function(prev, curr) {
        return (context.hasOwnProperty(curr) ? context[curr] : 1);
      });

      // Return the proper pixel ratio by dividing the device ratio by the backing ratio
      return deviceRatio / backingRatio;
    },
{% endhighlight %}

The comments are pretty verbose, but a secondary quick rundown of whats going on:

1. We create an array of the properly browser-prefixed backing store props. (10 - 16)
2. We reduce our array to a single backing store ratio, defaulting to 1 if none exist. (21 - 23)
3. We divide the device pixel ratio (from the window) by the backing ratio, giving us our pixel ratio. (26)

Next, we need to apply our calculated ratio to our canvas then downscale the entire canvas via CSS and transforms, giving us predictable high quality rendering with predictable dimensions. We'll toss all of this inside of another canvas utility, then return the canvas to our main game object for instantiation and dom injection.

{% highlight javascript linenos %}
// /js/utils/utils.canvas.js

/** Generate a canvas with the proper width / height
 * Based on: http://www.html5rocks.com/en/tutorials/canvas/hidpi/
 */
generateCanvas : function generateCanvas(w, h) {
  console.log('Generating canvas.');

  var canvas = document.createElement('canvas'),
      context = canvas.getContext('2d');
  // Pass our canvas' context to our getPixelRatio method
  var ratio = this.getPixelRatio(context);

  // Set the canvas' width then downscale via CSS
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  canvas.style.width = w +'px';
  canvas.style.height = h +'px';
  // Scale the context so we get accurate pixel density
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  return canvas;
}
{% endhighlight %}

Again, pretty straight forward. You'll notice that after creating our canvas and getting the context, we're passing that context to our `getPixelRatio()` method then multiplying our canvas width and height by the returned number, then setting the width and height _styles_ to the original width and height; this is us _downscaling_ the canvas. It's kind of like if you watch a 1080p video on YouTube at 400px wide. Our transform is then relatively scaling the canvas back up by the amount we downscaled it, that way we get accurate pixel sizes. Try removing the setTransform and viewing the effects, it's super interesting.

Now that both of our utility methods for canvas generation are created, we can rewrite our main game module create a properly sized canvas dynamically and then append it into our container, giving us our viewport.

{% highlight javascript linenos %}
var cUtils = require('./utils/utils.canvas.js'),
    $container = document.getElementById('container');

function Game(w, h) {
  // Generate a canvas and store it as our viewport
  this.viewport = cUtils.generateCanvas(w, h);
  this.viewport.id = "gameViewport";

  // Get and store the canvas context as a global
  this.context = this.viewport.getContext('2d');

  // Append our viewport into a container in the dom
  $container.insertBefore(this.viewport, $container.firstChild);

  // Spit out some text
  this.context.font = '32px Arial';
  this.context.fillStyle = '#fff';
  this.context.fillText('It\'s dangerous to travel this route alone.', 5, 50);

  return this;
}

// Instantiate a new game in the global scope at 800px by 600px
window.game = new Game(800, 600);

module.exports = game;
{% endhighlight %}
