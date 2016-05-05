---
layout: post
title:  "Building a simple JavaScript game - 1. A basic game engine"
date:   2015-11-27 9:45:48
category: development
tags:
  - javascript
  - games
  - game development
  - dungeon crawler
  - code along
feature: js-game-p1-feature.png
featureico: js-game-p1-feature-icon.png
featurealt: The start of our fantastic vidja-game.
excerpt: Playing video games is fun. JavaScript is fun. So..... Why not both? In this episode, we'll be building a basic game engine as a foundation to build on.
---

Once I started getting into web development my desire to be a game developer got put on the back burner while I continued to explore and build my skills as a web developer. As my experience grew and I began to understand the underlying concepts behind what makes a game it started to come back around again, but instead of using traditional languages I've been having a lot of fun experimenting with video game development with JavaScript.

There are plenty of existing libraries and foundations for JavaScript game development you can build off of ([Phaser](http://phaser.io/), [Unity](http://unity3d.com/), [Kiwi](http://www.kiwijs.org/), [PlayCanvas](https://playcanvas.com/)), my personal favorite being Unity. However, there is a certain charm and satisfaction that comes from building something from scratch. If you're looking to jump right into build a crazy 3D cross-platform behemoth I'd certainly suggest checking out some of the frameworks/engines referenced above, but for the sake of a great educational exercise, we'll be building a simple little top-down game from scratch.

Before we continue, I'd just like to mention that throughout the writing and development of this simple game I'm going to be listening to a live performance from the Legend of Zelda: Symphony of the Goddesses to really get into the spirit of the project. I highly recommend you fire it up and do the same, it's terrific!

<iframe class="inline-youtube" width="640" height="360" src="https://www.youtube.com/embed/Vbfc3HAOw7o?rel=0" frameborder="0" allowfullscreen></iframe>

## High-level overview

We're going to be making a simple top-down game with basic old-school gameplay characteristics. The finished product will allow us to walk around a small town, go in buildings, and fight baddies just outside the town. As the character moves, the camera will remain still until it either gets to the edge of the viewport or moves within a _door tile_. When these two events occur, the camera will either move to display the next portion of the world or the player will be transported into a new room (whatever the door leads to), respectively.

We'll be using the [HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) to handle rendering our game, and we'll be developing our JavaScript with the help of [Gulp](http://gulpjs.com/), [Browserify](http://browserify.org/), and [Browser Sync](http://www.browsersync.io/). In terms of managing what's going on within the game, we'll be attaching state objects to all of our different components so we can manage the current state of each component individually, which I personally find to be the easiest method of monitoring and managing data.

I've completed a basic project boilerplate you can download and follow along with, available on [Github](https://github.com/aesinv/javascript-game-demo/releases/tag/0.1.0-boilerplate). Alternatively, you can visit the [repository](https://github.com/aesinv/javascript-game-demo/) for the demo and just checkout commit 3a4f588. If you'd like a more in-depth look at setting up Gulp for projects, you can check out a [previous post]({% post_url 2015-8-29-building-a-gulp-workflow-around-jekyll %}) that goes over building a gulp file for Jekyll pretty thoroughly.

## Getting started

Our first order of business will be creating a good project foundation. We could build this entire thing in a single monstrous file, but for the sake of readability and maintainability I'm more a fan of modularity, which is why I've opted to build out the game and its components as modules then bundle them together via [browserify](http://browserify.org/). Let's have a look at our proposed project structure:


    index.html  // Loads up game module for game-playing party time.
    /js/        // Main JS root.
    - game.js   // Primary game module.
    - core/     // Contains core "engine"-related modules.
    - players/  // Contains all enemy/character-related modules.
    - utils/    // Contains global constants/utility functions.
    - world/    // Contains the main world classes and all levels.


It's a pretty simple structure, and should be fairly predictable. Our main `game.js` file will require the proper modules from `players/`, `utils/`, `core/`, and `world/` as dependencies, which will in turn require any additional dependencies needed to generate our game. In this part we'll more than likely only touch one (maybe two) files in each directory.

## Creating a viewport with canvas

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
  this.viewport.id = "gameViewport"; // give the canvas an ID for easy CSS/JS targeting

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

Our Game module remains largely the same, apart from us using the `generateCanvas()` method from our canvas utilities module to create our viewport instead of manually creating it. On the upside, we should now have a dynamically generated high resolution canvas to play around with, so now we have to figure out how to prime it for game play.

## Creating a game loop

So we've got a canvas and some folders that make us look like we really know what we're doing. Reasonable next steps involve creating some sort of rendering and logic engine to handle updating the games state, and re-rendering our canvas to reflect the updated state. Luckily, we can take care of both of these in one fell swoop by creating a [_game loop_](https://developer.mozilla.org/en-US/docs/Games/Anatomy).

When it comes to animating and managing a canvas there are a few more hoops to jump through than when you're animating a typical dom node, mostly because you can't really reference the created canvas contents after you've rendered them. To solve this we're going to wind up storing everything within a central state; with individual entities (players, enemies, etc.) storing they're positioning and other pertinent data within their own states. Then, when it's time to re-render, we'll call each entities `render()` method which will use the data within their states to render the entity correctly.

Since with a canvas we need to clear objects out before re-rendering them in a different position, we're going to be re-rendering the entire canvas every frame. To accomplish this we're going to need a loop, which being JavaScript there are millions of ways to do that. Let's take a look at our primary options:

1. [`setTimeout`](https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout) or [`setInterval`](https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setInterval) set to an interval that would fire off at a rate that would equal our target <abbr title="Frames per second">FPS</abbr>.
2. Utilize [`window.requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), which is the recommended method, to tell the browser we'd like to do an animation and to fire our render method before the next repaint.

Our first option, using `setTimeout` or `setInterval` would be much easier (and readable for the most part), but it's incredibly inefficient. The second option, while being way more complex, is miles more efficient due to the browser being able to optimize animations during repaint cycles.

### Scaffolding out the loop

Let's start by scaffolding out the modules that we'll be needing for our main loop. The main loop will have three parts:

    /js/core/game.loop.js // The actual loop
    /js/core/game.update.js // An update method
    /js/core/game.render.js // A rendering method

These modules will need to access some constants that we will be setting in our global game module, so we're going to create a new `constants` property along with an empty `state` within our main game module first.

{% highlight javascript linenos %}
function Game(w, h, targetFps, showFps) {
    // Setup some constants
    this.constants = {
        width: w,
        height: h,
        targetFps: targetFps,
        showFps: showFps
    };

    // Instantiate an empty state object
    this.state = {};
    . . .
}

// Instantiate a new game in the global scope at 800px by 600px
window.game = new Game(800, 600, 60, true);
{% endhighlight %}

In addition to our original props for the width and height, we've also added a target frame rate prop and a flag for whether or not to render the current FPS; the latter being totally optional both in implementation and use. Now that we're storing all of this inside of a handy dandy exposed object, we can start on our new modules.

Since these are all integral to the functioning of our game, we can count these modules as _core_ modules which we'll instantiate from our main game module. Since the update and rendering method are fairly simple and straight forward (for now), so let's start with those.

#### The game update module

Since we're just scaffolding out our loop and currently have no actual functionality, our update method is going to be really boring. Eventually it will take the games state object, determine changes in, update it, then return it. We'll just pretend we're doing fancy stuff for now though.

{% highlight javascript linenos %}
// /js/core/game.update.js

/** Game Update Module
 * Called by the game loop, this module will
 * perform any state calculations / updates
 * to properly render the next frame.
 */
function gameUpdate ( scope ) {
    return function update( tFrame ) {
        var state = scope.state || {};

        // If there are entities, iterate through them and call their `update` methods
        if (state.hasOwnProperty('entities')) {
            var entities = state.entities;
            // Loop through entities
            for (var entity in entities) {
                // Fire off each active entities `render` method
                entities[entity].update();
            }
        }

        return state;
    }
}

module.exports = gameUpdate;
{% endhighlight %}

Like I said, nothing super crazy going on. We're injecting the global scope (8), then creating a new object based off of the global state (10), iterating through entities in the global state (13), firing the `update()` method for each active entity (16 - 22), then returning it (15). Easy.

One interesting thing you may have noticed is that I'm expecting a `scope` parameter to be passed in first, then I'm returning another function that is actually doing all of the work. You'll see this in the render method as well, and it's more of a personal preference more than anything. An alternative would be to remove the returned function, move it's contents into the main `gameUpdate` function, and instead of injecting the scope we'd tap into the global `window.game` object. Since I want to avoid hard coding these references in, I'm just injecting the scope as a parameter.

#### The game render module

The render module is a little more busy than our update one, but it's nothing too crazy yet. We're going to move our dummy text from the main game module into this one, add our FPS rendering logic, then write a quick little loop to iterate through potential active entities.

{% highlight javascript linenos %}
// /js/core/game.render.js

/** Game Render Module
 * Called by the game loop, this module will
 * perform use the global state to re-render
 * the canvas using new data. Additionally,
 * it will call all game entities `render`
 * methods.
 */
function gameRender( scope ) {
    // Setup globals
    var w = scope.constants.width,
        h = scope.constants.height;

    return function render() {
        // Clear out the canvas
        scope.context.clearRect(0, 0, w, h);

        // Spit out some text
        scope.context.font = '32px Arial';
        scope.context.fillStyle = '#fff';
        scope.context.fillText('It\'s dangerous to travel this route alone.', 5, 50);

        // If we want to show the FPS, then render it in the top right corner.
        if (scope.constants.showFps) {
            scope.context.fillStyle = '#ff0';
            scope.context.fillText('FPS', w - 100, 50);
        }

        // If there are entities, iterate through them and call their `render` methods
        if (scope.state.hasOwnProperty('entities')) {
            var entities = scope.state.entities;
            // Loop through entities
            for (var entity in entities) {
                // Fire off each active entities `render` method
                entities[entity].render();
            }
        }
    }
}

module.exports = gameRender;
{% endhighlight %}

Like the update module we're injecting the games context (10), then we're clearing the canvas (17), rendering our dummy content (19-22) and setting it up to show the FPS in the top right corner of the canvas if the `showFps` flag is set (25-28).

The only fanciness occurring here is between lines 31 and 38, where we are iterating through all active entities with a simple [`for...in`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in) loop (if the global state has any entities set, as per line 31), then firing off the `render()` method of each active entity (36).

We'll be returning to this module in a little bit to change the text we're writing in place of the actual frame rate, but for now it's completed.

#### The loop of doom

Now it's time for us to move onto our mythical loop, which will by far be the most complex portion of code we've written yet. As I mentioned earlier, we're going to be using `requestAnimationFrame` to handle our loop, as recommended by [MDN](https://developer.mozilla.org/en-US/docs/Games/Anatomy) and based off of information from [Paul Irish](http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/), coupled together with some frame rate throttling based on some terrific [stack overflow answers](http://stackoverflow.com/a/19772220).

I know that's a lot to swallow, so we'll tackle this one one by one. Let's start with the loop itself, then we'll jump into the frame rate throttling.

{% highlight javascript linenos %}
// /js/core/game.loop.js

/** Game Loop Module
 * This module contains the game loop, which handles
 * updating the game state and re-rendering the canvas
 * (using the updated state) at the configured FPS.
 */
function gameLoop ( scope ) {
    var loop = this;

    // Main game rendering loop
    loop.main = function mainLoop( tframe ) {
        // Request a new Animation Frame
        // setting to `stopLoop` so animation can be stopped via
        // `window.cancelAnimationFrame( loop.stopLoop )`
        loop.stopLoop = window.requestAnimationFrame( loop.main );

        // Update the game state
        scope.state = scope.update( now );
        // Render the next frame
        scope.render();
    };

    // Start off main loop
    loop.main();

    return loop;
}

module.exports = gameLoop;
{% endhighlight %}

By itself the loop isn't too terrifying at all, and if you've checked out the MDN docs on the anatomy of a web game it should be very familiar; we're just creating a callback and passing it into `window.requestAnimationFrame`, then firing off our update and render methods, which are instantiated in the global context (which has been injected in). I realize this isn't the most elegant way to fire off the update and render methods, but my reasoning is to have the update and render modules instantiated and exposed globally if, for whatever reason, they need to be triggered manually. An alternative to this would be to require the modules within the game loop module, and instantiate them with the injected context.

Next, we'll start with our frame rate throttling. There's quite a lot to this, so I'll try to break it down as best as I can. First we need to set up our variables for calculating the frame rate. We're going to require the current animation tick timestamp, the previous animation tick timestamp as well as the difference between the two; our target FPS and our target interval between animation ticks _(1000 / fps)_.

{% highlight javascript linenos %}
    // /js/core/game.loop.js, lines 9 - 30

    // Initialize timer variables so we can calculate FPS
    var fps = scope.constants.targetFps, // Our target fps
        fpsInterval = 1000 / fps, // the interval between animation ticks, in ms (1000 / 60 = ~16.666667)
        before = window.performance.now(), // The starting times timestamp

        // Set up an object to contain our alternating FPS calculations
        cycles = {
            new: {
                frameCount: 0, // Frames since the start of the cycle
                startTime: before, // The starting timestamp
                sinceStart: 0 // time elapsed since the startTime
            },
            old: {
                frameCount: 0,
                startTime: before,
                sineStart: 0
            }
        },
        // Alternating Frame Rate vars
        resetInterval = 5, // Frame rate cycle reset interval (in seconds)
        resetState = 'new'; // The initial frame rate cycle

    loop.fps = 0; // A prop that will expose the current calculated FPS to other modules

    // Main game rendering loop
    loop.main = function mainLoop( tframe ) { . . . }
{% endhighlight %}

Whoa, that's a lot of variables. Keeping the code comments in mind, there's one thing I would like to explain which is the `cycles` object. If you look at the stack overflow answer I mentioned earlier, there's a lot of examples of some calculations to determine and throttle the frame rate, but they use a single computation cycle which while testing I noticed some issues with.

1. After a while, the performance would bog down due to the constant incrementation of the single frame count and elapsed time variables.
2. Also after some time, the accuracy would drastically decrease. As the calculations depend on the current time and frame count in relation to the original time, because the gap was so massive the resulting value would be mis-representative of the actual frame rate and would act as more of an "average-over-the-time-you've-had-this-page-open".

The second issue may be more of a presentation of the frame rate problem I admit, but as a solution I've made it so there are two increments going on in parallel and as they reach a pre-determined interval, `resetInterval`, the active cycle will get reset to 0 and the alternate cycle will take its place as the active cycle. This helps maintain an accurately calculated frame rate based on samples from a short period of time, rather than an increasingly large period of time.

Now, back to our loop.

{% highlight javascript linenos %}
// /js/core/game.loop.js, lines 32. . .82

loop.main = function mainLoop( tframe ) {
    // Request a new Animation Frame
    // setting to `stopLoop` so animation can be stopped via
    // `window.cancelAnimationFrame( loop.stopLoop )`
    loop.stopLoop = window.requestAnimationFrame( loop.main );

    // How long ago since last loop?
    var now = tframe,
        elapsed = now - before,
        activeCycle, targetResetInterval;

    // If it's been at least our desired interval, render
    if (elapsed > fpsInterval) {
        // Set before = now for next frame, also adjust for
        // specified fpsInterval not being a multiple of rAF's interval (16.7ms)
        // ( http://stackoverflow.com/a/19772220 )
        before = now - (elapsed % fpsInterval);

        // Update the game state
        scope.update( now );
        // Render the next frame
        scope.render();
    }
};
{% endhighlight %}

Throttling the loop to our ideal fps is actually relatively simple, as you can see above. Here are the headlines:

- **Lines 8 & 9:** cache the current timestamp, then subtract the previous timestamp from it to get the elapsed time.
- **Line 13:** If the elapsed time from line 9 is greater than our target interval, continue with the re-render.
- **Lines 14 - 22:** Set the variable holding the previous timestamp to the current timestamp, then fire the update and render modules.

Pretty straight forward, so now let's calculate the current frame rate and expose it for other modules (namely the rendering module).

{% highlight javascript linenos %}
// /js/core/game.loop.js, lines 49 - 78

before = now - (elapsed % fpsInterval);

// Increment the vals for both the active and the alternate FPS calculations
for (var calc in cycles) {
    ++cycles[calc].frameCount;
    cycles[calc].sinceStart = now - cycles[calc].startTime;
}

// Choose the correct FPS calculation, then update the exposed fps value
activeCycle = cycles[resetState];
loop.fps = Math.round(1000 / (activeCycle.sinceStart / activeCycle.frameCount) * 100) / 100;

// If our frame counts are equal....
targetResetInterval = (cycles.new.frameCount === cycles.old.frameCount
                       ? resetInterval * fps // Wait our interval
                       : (resetInterval * 2) * fps); // Wait double our interval

// If the active calculation goes over our specified interval,
// reset it to 0 and flag our alternate calculation to be active
// for the next series of animations.
if (activeCycle.frameCount > targetResetInterval) {
    cycles[resetState].frameCount = 0;
    cycles[resetState].startTime = now;
    cycles[resetState].sinceStart = 0;

    resetState = (resetState === 'new' ? 'old' : 'new');
}

// Update the game state
{% endhighlight %}

This is probably the most we've got going on so far, so let's review it block by block.

- **Lines 4 - 7:** First we're going to iterate through both cycles, increment the frame counts and update the elapsed times since the start of the cycle.
- **Lines 10 & 11:** Set the active cycle, then use some maths to determine and set our exposed property to the current frame rate.
- **Lines 12 - 15:** Set our target reset interval. Once the cycles begin alternating, when the _active_ cycle reaches it's target, the _inactive_ cycle will be equal to half of the target since it runs in parallel. Therefore, rather than resetting at our interval, we want to reset at double our interval.
- **Lines 21 - 27:** If the active cycles frame count is greater than its target interval, reset the active cycle to 0 and switch to the inactive cycle.

Now that that's completed, we can run back to our rendering module (`/js/core/game.render.js`) and toss our exposed `loop.fps` value in place of our dummy _'FPS'_ text:

    scope.context.fillText(scope.loop.fps, w - 100, 50);

#### Wrapping it all together

Since we have all of our modules built and exposed as exportable modules, we can now simply instantiate them within the main game module and our game should automagically run our main loop, displaying the frame rate in the top right corner if you've set your `showFps` parameter to true.

{% highlight javascript linenos %}
. . .
$container.insertBefore(this.viewport, $container.firstChild);

// Instantiate core modules with the current scope
this.update = gameUpdate( this );
this.render = gameRender( this );
this.loop = gameLoop( this );

return this;
{% endhighlight %}

Huzzah! We've built (albeit basic) our own rudimentary game engine! It automagically generates a high resolution canvas element and injects it into our HTML, updates itself at a configurable frame rate, and displays said frame rate using an alternating calculation cycle strategy (which you can see if you toss a log of the frame rate of both cycles into your loop).

<!-- video -->

## Bonus: Creating a movable player

I could end there, but I usually get really annoyed whenever I see a multi-part how-to that completely leaves me hanging before magic happens, so I don't want to be _"that guy"_. To some people, getting the loop completed is magical and they're probably way stoked at the moment; I am as well but I think an even more magical stopping point would be the ability to move a little box around the viewport. Nothing crazy, just enough to be interactive and really get the inspiration flowing when you get that "Eureka!" moment as you're moving the box around the viewport aimlessly.

Let's get cracking.

### Creating our player module

Earlier I kept mentioning _entities_, which is essentially what we're going to be creating. If you've played around in Unity before, the term will be familiar to you as Unity games are built from entities. Entities are essentially interactive components such as NPC's, enemies, projectiles, etc. Eventually, our entity will have tons of different methods and properties such as health, damage, attack, and other game-type stuff; for now all we're going to be needing is a state that will contain our position within the viewport, a render method, and an update method.

As far as utilities go, foreseeable necessary utilities include a way to bind our number to a specific boundary (the width of our viewport and 0) and a way of determining whether or not a key is being pressed at any time. Let's start by scaffolding out our player entity, then we can create and plug in those utilities as needed.

{% highlight javascript linenos %}
// /js/players/player.js

/** Player Module
 * Main player entity module.
 */
function Player(scope, x, y) {
    var player = this;

    // Create the initial state
    player.state = {
        position: {
            x: x,
            y: y
        },
        moveSpeed: 1.5
    };

    // Set up any other constants
    var height = 23,
        width = 16;

    // Draw the player on the canvas
    player.render = function playerRender() {
        scope.context.fillStyle = '#40d870';
        scope.context.fillRect(
            player.state.position.x,
            player.state.position.y,
            width, height
        );
    };

    // Fired via the global update method.
    // Mutates state as needed for proper rendering next state
    player.update = function playerUpdate() {
        // Check if keys are pressed, if so, update the players position.
        // Bind the player to the boundary
    };

    return player;
}

module.exports = Player;
{% endhighlight %}

As you can see, our entity structure is extremely similar to all of our other modules; we just have an exported function declaration with some properties and methods exposed. What's important to note here are the exposed `render` and `update` methods, lines 23 - 30 and 34 - 37, respectively. You'll remember that in both our global update and render modules we're iterating through all of the active entities and firing off these methods, so the inclusion of them within our entity is crucial.

Again, we're injecting the scope into the module but this isn't 100% necessary; we could also inject it by ditching the `scope` parameter and using the `window.game` global to get the context. Since we were injecting it earlier, I'm sticking with that here. If it winds up bugging me later, I'm sure I'll change it in the next post.

Technically, as long as we instantiate the player module our game should function and render our player in our viewport. This will more than likely occur on a per-level (or world) basis, but for now we'll just toss that into our main module.

{% highlight javascript linenos %}
// /js/game.js, lines 40 - 51

that = this;

var createPlayer = function createPlayer() {
    // Set the state.entities prop to an empty object if it does not exist
    that.state.entities = that.state.entities || {};
    // Instantiate a player as an active entity
    that.state.entities.player = new playerEnt(
        that,
        that.constants.width / 2,
        that.constants.height - 100
    );
}();
{% endhighlight %}

#### Getting our player to move

Now that we've got a working entity it's time for us to fill up the entities update method so it actually does something. Our first order of business is getting our player to move around whenever we press the arrow keys down. Since we're not using jQuery or any libraries we're going to have to figure out a way to gracefully monitor the dom for key down events, then store whether or not a key is down at any given point as a boolean. There's two ways we can do this, we can either return some functions that will act as getters and retrieve whatever the keys variable is set to at that moment (`keys.isLeftPressed()`), or we can utilize [Object.defineProperty](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) to actually create some getters for the variables (`keys.isPressed.left`). This is obviously left completely to personal preference, and I'm going to be using `Object.defineProperty` because I like the syntax it leaves us with.

{% highlight javascript linenos %}
// /js/utils/utils.keysDown.js

/** keysDown Utility Module
 * Monitors and determines whether a key
 * is pressed down at any given moment.
 * Returns getters for each key.
 */
function keysDown() {
    // Set isPressed to an empty object
    this.isPressed = {};
    var left, right, up, down;

    // Set up `onkeydown` event handler.
    document.onkeydown = function (ev) {
        if (ev.keyCode === 39) { right = true; }
        if (ev.keyCode === 37) { left = true; }
        if (ev.keyCode === 38) { up = true; }
        if (ev.keyCode === 40) { down = true; }
    };

    // Set up `onkeyup` event handler.
    document.onkeyup = function (ev) {
        if (ev.keyCode === 39) { right = false; }
        if (ev.keyCode === 37) { left = false; }
        if (ev.keyCode === 38) { up = false; }
        if (ev.keyCode === 40) { down = false; }
    };

    // Define getters for each key
    // * Not strictly necessary. Could just return
    // * an object literal of methods, the syntactic
    // * sugar of `defineProperty` is just so much sweeter :)
    Object.defineProperty(this.isPressed, 'left', {
        get: function() { return left; },
        configurable: true,
        enumerable: true
    });

    Object.defineProperty(this.isPressed, 'right', {
        get: function() { return right; },
        configurable: true,
        enumerable: true
    });

    Object.defineProperty(this.isPressed, 'up', {
        get: function() { return up; },
        configurable: true,
        enumerable: true
    });

    Object.defineProperty(this.isPressed, 'down', {
        get: function() { return down; },
        configurable: true,
        enumerable: true
    });

    return this;
}

module.exports = keysDown();
{% endhighlight %}

Now, I understand that this probably looks about as graceful as an ice skating bear with all of its if blocks, but it's certainly a lot better than polluting our entity with all of this mumbo jumbo (trust me on this, I had it within the module when I first wrote it and the tears were real). So, what's goin' on here?

- We prep our `isPressed` property by setting it to an empty object and we cache all of our variables (10, 11).
- Set up event listeners for when a key is pressed down, then we determine what keys are pressed and set variables accordingly (14 - 19).
- Similarly, we set up event listeners for when a key is released and again set variables accordingly. This is crucial as it will tell our game _"Hey, we're not moving left anymore"_ (22 - 27).
- Finally, we define some getters for each of our keys. They aren't the most complex getters in the world, but they're terrific as they give us the syntax of a variable declaration, but it will return whatever value is active at the time (33 - 55).

After requiring this module into our player module, we then have access to the ability to request whether a key is active or not at any given time by calling that keys property within the `isPressed` object (`keys.isPressed.left` for example).

{% highlight javascript linenos %}
// /js/players/player.js
var keys = require('../utils/utils.keysDown.js');

/** Player Module
 * Main player entity module.
 */
function Player(scope, x, y) {
. . .
    player.update = function playerUpdate() {
        // Check if keys are pressed, and if so, update the players position.
        if (keys.isPressed.left) {
            player.state.position.x -= player.state.moveSpeed;
        }

        if (keys.isPressed.right) {
            player.state.position.x += player.state.moveSpeed;
        }

        if (keys.isPressed.up) {
            player.state.position.y -= player.state.moveSpeed;
        }

        if (keys.isPressed.down) {
            player.state.position.y += player.state.moveSpeed;
        }

        // Bind the player to the boundary
    };
. . .
}

module.exports = Player;
{% endhighlight %}

Easier than expected, huh? And since we've defined our moveSpeed as a variable, later on we can alter the move speed dynamically to implement things like smooth surfaces, boost power ups, sprinting, etc. The only downside that we're left with is if we keep going left for instance, we could easily get lost in the depths of the out-of-viewport wilderness; never to return. Let's fix that.

#### Binding our position to a boundary

When I say we're going to be binding our position to a boundary, it's just a fancy way of saying that we're going to be forcing our coordinates to not exceed a minimum or maximum value. It's a really simple trick, and while it isn't absolutely necessary to have as its own module it makes using it within our player module a lot cleaner. Not to mention we can always extend the module to contain other math-related helper functions as well.

{% highlight javascript linenos %}
// /js/utils/utils.math.js

/**
 * Number.prototype.boundary
 * Binds a number between a minimum and a maximum amount.
 * var x = 12 * 3;
 * var y = x.boundary(3, 23);
 * y === 23
 */

var Boundary = function numberBoundary(min, max) {
    return Math.min( Math.max(this, min), max );
};

// Expose methods
Number.prototype.boundary = Boundary;
module.exports = Boundary;
{% endhighlight %}

All we're doing here is taking the min and max boundaries, and applying our current position so it won't exceed those two boundary points. Some _"Eureka!"_'s include that since we're extending the prototype of the Number object our number is available to us within the method via `this`, and I'm only exporting it as a module to get browserify to bundle the file up with the rest of our project.

Now we can jump back into our player module and change our update method to bind our position to the boundaries we've set.

{% highlight javascript linenos %}
// /js/players/player.js
var keys = require('../utils/utils.keysDown.js'),
    mathHelpers = require('../utils/utils.math.js');

/** Player Module
 * Main player entity module.
 */
function Player(scope, x, y) {
    . . .

    player.update = function playerUpdate() {
        // Check if keys are pressed, if so, update the players position.
        . . .

        // Bind the player to the boundary
        player.state.position.x = player.state.position.x.boundary(0, (scope.constants.width - width));
        player.state.position.y = player.state.position.y.boundary(0, (scope.constants.height - height));
    };

    . . .
}

module.exports = Player;
{% endhighlight %}

Trust me, this is a LOT cleaner than tossing all of that _min max_ stuff into the module. As I mentioned before, since we extended the `Number` objects prototype with `Number.prototype.boundary`, that method is now available to all Numbers within our project. Since x and y are numbers rather than strings, they can then use boundary to return the proper position.

<div class="bg-video-wrap" style="background-image: url('/img/videos/gulpVid.png');">
  <video class="bg-video-player" autoplay loop>
    <source src="/img/videos/game-engine-vid.mp4"  type="video/mp4; codecs=avc1.42E01E,mp4a.40.2">
    <source src="/img/videos/game-engine-vid.webm" type="video/webm; codecs=vp8,vorbis">
    <source src="/img/videos/game-engine-vid.ogv"  type="video/ogg; codecs=theora,vorbis">
  </video>
</div>

## Wrapping Up

So, let's review what we've done in this episode:

- Built a pretty rad project structure that is fairly predictable and easy to work with.
- Created a dynamically generated high-resolution canvas and injected it into the dom as a viewport.
- Built out a rudimentary rendering and logic engine using `requestAnimationFrame`, dynamically throttling it to a configurable frame rate
- Made a two-cycle alternating frame rate calculator for frame rate monitoring during development
- Created our first interactive entity, the player, and added logic to move him around the screen
- Got a feel for how to add onto to our project foundation

Not too shabby for a first pass. I know we mostly did the _behind the scenes_ stuff (the kind of stuff that takes forever, then you excitedly show it to the client and they go "uhhh. that's it? that's all you've done? what am I looking at?") and the current iteration isn't the most exciting thing in the world, but it's a solid platform for us to start with. In the next couple posts we'll start going in and doing the exciting stuff like creating sprites for our entities, generating levels, writing in collision detection, and possibly extracting our logic update layer further for more efficiency.

If you'd like to check out the code for this post in full, you can check it out on the [github repo](https://github.com/aesinv/javascript-game-demo/tree/0.2.0-p1) (specifically the 0.2.0-p1 tag), or you can [download it](https://github.com/aesinv/javascript-game-demo/releases/tag/0.2.0-p1) as a zip or tar file.

Safe travels until next round!

## Adventure outline / parts

- **[Part 1: A basic game engine](#)**
- Part 2: Creating our game world - Coming soon
- Part 3: Sprites, enemies and danger - Coming soon
- Part 4: Implementing an event system - Coming soon
- Part ~: More will be added as they're written!
