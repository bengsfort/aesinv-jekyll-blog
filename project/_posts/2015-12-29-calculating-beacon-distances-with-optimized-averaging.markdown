---
layout: post
title:  "Calculating iBeacon distances with optimized averaging"
date:   2015-12-29 11:30:48
category: development
tags:
  - javascript
  - ibeacon
  - beacons
  - utilities
  - IoT
  - Internet of Things
feature: average-optimizer-feature.png
featureico: average-optimizer-thumb.png
featurealt: Optimized averages from arrays of numbers.
excerpt: The past few weeks I've been working a lot with calculating user/device location via signal strength from iBeacons, and 90% of the time it feels like playing Russian Roulette with an Imperial Blaster. Here's how I got rid of the guess work via optimizing data averaging.
---

It's no real secret that beacons are most certainly still an "emerging technology" with some growing pains. Unfortunately when you're working on a hybrid app that depends on them, you kind of have to figure out a way to make things work. In this instance, it's trying to weed-out the distance/signal strength inconsistencies so user location can be calculated correctly and accurately. 

## The problem
When you're detecting your beacons via an app that's listening for them (using the [Proximity Beacon Plugin](https://github.com/petermetz/cordova-plugin-ibeacon) for [Cordova](https://cordova.apache.org/)/[Ionic](http://ionicframework.com/), for example) you receive a constant bombardment of objects representing that beacon that you can do with as you please, including an estimated distance _(referred to as Accuracy)_. Here's an example object you could expect to see back:

{% highlight javascript linenos %}
// Example beacon object
{
    proximity: 'ProximityNear',
    accuracy: 3.39,
    uuid: '140b70ed-cfb3-418g-8611-4dcd06d2d63d',
    major: 7,
    minor: 5,
    rssi: 50,
    tx: 1
}
{% endhighlight %}

Now, when I say you get bombarded by these objects I mean it. To circumvent this and spare the users phone my team and I have a throttling service that only allows us to submit the beacon data for location calculation every 3 seconds or so, however we noticed a major issue crop up every so often which involved our distance (accuracy, line 4) being incredibly inaccurate. We're talking upwards of 4 meters off from where we knew we were standing, which when the end result gets compared to a set of boundaries to determine whether or not the device is in a specified zone is a pretty big deal.

After lots of research and lots of data logging, we discovered two things:

1. On average the distance reported by the beacon is somewhat consistent, however the pool of reported distances gets polluted by plenty hilariously inaccurate distances.
2. Since we were not taking an average of our collection of distances, the distance that would get submitted for calculation was the last distance received before the timeout was finished; basically Beacon Distance Roulette. 

Number 2 isn't too big of an issue as it just involves storing beacon data in beacon-unique arrays then calculating the average of the stored distances for each array, which if the distances are stored as an array would be an extremely simple procedure:

{% highlight javascript linenos %}
// Example averaging of a beacon array
var averages = [];

// Iterate through beacons
for (key in beacons) {
  // beacons[key] = [5.27, 6.07, 5.45, 5.05, 4.04, 4.37, 4.55]
  averages[key] = beacons[key].reduce(function (prev, cur) {
    return prev + cur;
  }) / arr.length; // 4.97
}

// submit `averages` for calculation
{% endhighlight %}

So that leaves us with tricky number 1, which would fall short when it comes to regular averaging if there were enough inaccurate distances; therefore requiring a more intricate solution. 

## The solution
My first solution was to average the list twice, the first time being used to create a middle point to calculate the data pool for the second average. This however proved to be inaccurate as the distance inconsistencies grew farther apart. 

The solution I decided to go with was to create a simple utility that would iterate through the array of numbers, tally up how many times each whole number appeared within the array, then use along with a buffer to establish boundaries that I could use to ignore unreliable data. Coupled with the throttling, this turned out to be exactly the solution we were looking for/

I first decided to scaffold out the utility so I could get an idea of exactly what it was it would need to do. This is generally where I start with everything that I make, as I just find it easier to go through at a high level then start to dive in deeper where necessary.

{% highlight javascript linenos %}
// optimizedAverages.js
/**
 * Optimized Average calculation
 * Takes an array of numbers, then throws away unreliable numbers
 * to get a more precise average.
 *
 * @param {number[]} Numbers - Array of numbers to optimize.
 * @returns {number} - The optimized average, rounded to the nearest hundredth.
 */ 
var optimizedAverage = function optimizeDistanceAverage( Numbers ) {
  // Tally up the amount of times a whole number occurs in the array
  var countNums;
  
  // determine the most probable distance from the tally (the number that appears the most)
  var mostReliable;

  /** 
   * Get the average of the provided numbers that are:
   *  1. Less than double the most reliable number,
   *  2. More than half the most reliable number,
   *  then round it to the nearest hundredth.
   */
   var average;
   return average;
};

// Expose Utility to whatever needs it
if ( typeof module === "object" && module.exports ) module.exports = optimizedAverage;
if ( typeof window !== "undefined" ) window.optimizedAverage = optimizedAverage;
{% endhighlight %}

Let's start by writing some helpers that will come in handy for the rest, like an averaging function as well as a rounding function.

{% highlight javascript linenos %}
// optimizedAverages.js
. . .
var optimizedAverage = function optimizeDistanceAverage( Numbers ) {
  /**
   * Get the average from an array of numbers
   * @param {number[]} arr - Array of numbers to average
   * @returns {number} - The average of the numbers.
   */
  var getAverage = function getAverage( arr ) {
    return arr.reduce( function reduceGetAverage( prev, cur ) {
      return prev + cur;
    }) / arr.length;
  };

  /**
   * Round a number to the nearest hundredth
   * @param {number} num - the number to round
   * @returns {number} - the rounded result
   */
  var roundResult = function roundResult( num ) {
    return ( Math.round( num * 100 ) / 100 ).toFixed( 2 );
  };
  . . .
};
. . .
{% endhighlight %}

The averaging function (`getAverage()`, _lines 8 - 12_) is essentially the same as the block shown in the last section that averaged the array, so nothing new there. The rounding function (`roundResult()`, _lines 19 - 21_) isn't anything too special either, they're just some math calculations that would be extremely annoying to write more than once.

From there we can start getting into the real meat-and-potatoes of the utility, namely the function that iterates through the distance array and tallies up how popular each whole number is. Since it's JavaScript and this involves iterating through an array, there are obviously 8 million and four ways to write it however on this occasion I'm feeling the humble `for(;;) {}` loop, particularly because I've got to be able to declare keys to properly track each number.

{% highlight javascript linenos %}
// optimizedAverages.js
/**
 * Tallies up the amount of times a whole number occurs in the array.
 * @param {number[]} numbers - Array of numbers to iterate over.
 * @returns {object} - Returns the completed tally object.
 */
var countNums = function countNums( numbers ) {
  var count = [];

  for (var i = 0; i < numbers.length; ++i) {
    // Cache the whole number
    var floored = Math.floor( numbers[i] );
    // Check to see if we've already stored the number
    if ( !count.hasOwnProperty( floored ) ) {
      count[floored] = 1; // Start off the numbers tally
    } else {
      ++count[floored]; // Add to the tally
    }
  }

  return count;
}( Numbers ); // Self-invoke the function with the `Numbers` array
{% endhighlight %}

As for loops go it's a pretty basic one, but I'll walk you through what we're doing just in case:

1. Creating an empty array to hold our number tallies. _(line 7)_
2. Iterating through the passed in array, storing the active whole number as we go. _(lines 9, 11)_
3. Checking to see if the number already has a tally, if not we start it off at 1 and if so we increment it by 1. _(lines 13 - 17)_
4. Returning the array containing our tallies, then self-invoking the function with the array of distances passed into the utility. _(lines 20, 21)_

From there we're on the home stretch, as now we have an array telling us how many times each distance present in the array appears, so we can easily determine the most probable distance and use that to create a buffer zone of distances we'll still accept for our final average.

{% highlight javascript linenos %}
// optimizedAverages.js
// Determine the most reliable number (the number that appears most)
var mostReliable = countNums.reduce(function reduceMostReliable(prev, cur, i, arr) {
  return arr[prev] > cur ? prev : i;
}, 0);
{% endhighlight %}

Since we're saving our array containing our tally [reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce) can come to the rescue and _reduce_ our array down to a single, probable distance. This could be done a little bit more readable, but I'll break down the logic so it's a little bit easier to understand what's going on. 

The indexes of the array are the whole numbers that we got from our distances, so those are always available to us via `i`; since reduce provides the last returned value as `prev`, we can essentially persist the most probably whole number through `prev`, and still be able to access the amount of times it appeared by pointing the array to that index (`arr[prev]`). Therefore:

    if the current probable number (prev) appeared more times (arr[prev]) than the current value (cur)
       return the current probable number;
       otherwise return the current values index as the new probable number (i)

A little bit confusing, I know, but the second it clicks it makes all the sense in the world. As a bonus, it also means we're one code block away from being done! Lastly we have to get the rounded average of our reliable distances, which are dictated by whether or not they are:

1. Less than double the most probable distance
2. More than half of the most probable distance

There are a couple different ways to write this, so I'll start with the easy to read version then show the more compact version.

{% highlight javascript linenos %}
// optimizedAverages.js
/** 
 * Create a new array with the provided numbers that are:
 *  1. Less than double the most probable distance,
 *  2. More than half the most probable distance,
 */
var reliableList = Numbers.filter(function( num ) {
  return Math.ceil( num ) > ( mostReliable / 2 ) // ceil of the number is greater than half 
      && Math.floor( num ) < ( mostReliable * 2 ); // floor of the number is less than double
});

// Get the average of our new array
var reliableAverage = getAverage( reliableList );
// Return the rounded average
return roundResult( reliableAverage );
{% endhighlight %}

Here all we're doing is filtering through our original list and picking out any numbers that are over or under a certain threshold, that way we can keep our data pool small and accurate and get a better average. I've got it set at double and half, as I noticed that was a good buffer when reviewing the range of inconsistency in our data logs. 

By setting it at double and half we provide a larger buffer for the higher distances (which have a larger range of inconsistency), and far less wiggle room when we're closer to the beacon (when the distance will have less inconsistencies); making smaller distances more accurate and farther distances easier to estimate.

Like I said though, this final block can be written a little bit more concise as well:

{% highlight javascript linenos %}
/** 
 * Create a new array with the provided numbers that are:
 *  1. Less than double the most probable distance,
 *  2. More than half the most probable distance,
 */
return roundResult( getAverage( Numbers.filter( function( num ) {
  return Math.ceil( num ) > ( mostReliable / 2 ) && Math.floor( num ) < ( mostReliable * 2 );
}) ) );
{% endhighlight %}

Yummy, what was previously 8 lines is now 3! This is another benefit of us adding our helpers in earlier, instead of having to toss all of those calculations inline we can just call them in our return on the fly after calculating our new reliableList.

After all is said and done piping our distances through this utility should allow us to get far more accurate distance calculations thanks to ignoring unreliable data. Here's the results from some test runs I ran so you can see what I mean:

    Numbers provided: [1.97, 1.74, 1.44, 1.5, 1.47, 1.41, 1.42, 1.22, 1.17, 1.2, 2.15]
    Pre-optimized average: 1.52
    Numbers discarded: 1
    Optimized average: 1.45

    Numbers provided: [5.27, 2.25, 2.45, 1.87, 1.89, 2.11, 1.97, 2.06, 1.93, 2.22, 2.22]
    Pre-optimized average: 2.39
    Numbers discarded: 1
    Optimized average: 2.10

    Numbers provided: [14.78, 2.25, 2.45, 1.87, 1.89, 2.11, 9.33, 1.97, 2.06, 1.93, 2.22, 2.22, 11.17]
    Pre-optimized average: 4.33
    Numbers discarded: 3
    Optimized average: 2.22

You can view the full file [on GitHub](https://github.com/aesinv/optimized-averages/blob/master/optimizedAverages.js), with full comments and ready to roll. You can also play around with it on [Tonic](https://tonicdev.com/npm/optimized-averages).

Cheers!