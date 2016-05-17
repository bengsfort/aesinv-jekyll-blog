---
layout: post
title:  "Different ways to pass data from AEM6 to Javascript"
date:   2016-5-15 11:15:10
category: development
tags:
  - aem6
  - adobe cq
  - javascript
  - sightly
feature: aem-fe/feature.png
featureico: aem-fe/thumbnail.png
featurealt: A code editor along with two project structure diagrams.
excerpt: As dynamic experiences become more popular, data will need to find its way from AEM to front end Javascript. Here are some good options for passing data along without headaches.
---

## Tl;dr
>- Use `data-*` attributes to pass along information to JS, in some cases passing along a data URI so you can obtain data via AJAX.
>- Build a _component loader_ that pushes the required components into an initialization queue as the page gets parsed.
>- Create a data scraper that does the same as the last point, but functions a little bit more automated.

We've all been there. There's some fancy component that requires numerous different view states, all including a ton of data. Do you just dump all of that into the DOM and hide the elements when they're not in use, potentially adding to your initial load time and bloating up your markup? Do you dynamically call for the new data every time the user uses the call to action, potentially slowing their real-time experience? Since this is web development  there are 4.3 billion ways to do everything, each with their own benefits and drawbacks.

So far in [AEM][aem] land I've tried quite a few different options for passing data to the front end, and some have worked far better than others. What I've personally used that have worked the best include using data attributes and AJAX calls either on demand or to snag and cache the rest of the data after first load, using some sort of _component loader_ that builds a queue of components to load at runtime then initializes them with data, and building a data scraper that, similar to the component loader, scrapes the page for key identifiers and then initializes each component with the data scraped from the page.

We'll go into each one and when each makes sense to use, as well as take a look at some examples on how to implement each option. Examples will be using jQuery since the vast majority of projects use it, but all of these options work great with vanilla Javascript as well.

## Data attribute fun

First up let's take a look at utilizing `data-*` attributes to pass along data to Javascript. Data attributes are semantic, standards compliant and very popular ever since their inclusion in HTML5, so they're definitely a more obvious choice. In fact if you're already well-versed in data attributes you can feel free to jump down to the next option as this will probably end up just being a refresher.

Data attributes benefit in that they're almost effortless to implement (compared to the other options) and  semantically correct. Where they lose is large amounts of data and in some cases readability. For this reason data attributes are best paired with small amounts of simple data and a data URI that the Javascript can hit with a request for more yummy data.

{% highlight html %}
<!--/* component.html */-->
<div class="namespace-component js-component"
    data-form-trigger=".js-trigger-field"
    data-form-field=".js-data-field"
    data-option-prefix="${component.optionPrefix}"
    data-form-uri="${component.formUri}">
    <!-- your markup -->
</div>
{% endhighlight %}

So let's pretend we've got a form. When the user updates one select we need to grab some data based on that select, tack it onto the end of a data URI that the back end dev has provided and use that to grab some JSON data from AEM which we can then toss into a different select, with an authorable prefix.

We've added the element selectors for our elements onto our main component as data attributes, along with the data URI and option prefix that AEM has graciously given us after being configured by our content author. We now have direct access to all of these, and can use them directly in our Javascript by accessing the main components `.data()` property with jQuery, or `.dataset` property with vanilla JS.

{% highlight javascript %}
// component.js
var $component  = $('.js-component'),
    $trigger    = $component.find($component.data('form-trigger')),
    $field      = $component.find($component.data('form-field')),
    prefix      = $component.data('option-prefix'),
    contentUri  = $component.data('form-uri');

// When the trigger is changed
$trigger.on('change', function() {
    // Get JSON from the content URI
    $.getJSON(contentUri+$trigger.val(), function (data) {
        // Iterate through the options array we've recieved
        var result = data.options.reduce(function(prev, opt) {
            // Construct an HTML string of our new options
            return prev + "<option value='"+ opt.value +"'>" + prefix + opt.label + "</option>";
        }, "");
        // Inject the new content into our select
        $field.html(result);
    });
});
{% endhighlight %}

Simple and effective. We're not hardcoding anything that shouldn't be hardcoded, and we've given the user the ability to configure something that is dynamic and would have previously been un-configurable. Furthermore, implementation was incredibly simple as data attributes are a 1:1 in both the markup and JS, so grabbing them from the markup was as easy as grabbing any other elements property. Plus we don't have to hardcode in a URL, given the back end developer has created a Sightly-retrievable property containing the proper URL.

The only downside to this particular implementation is the arguably ugly element block and the fact that we couldn't just pass in some JSON without making the markup even uglier. Some people won't mind it at all, but many developers find mass data attributes to be one of the ugliest sins of all humanity.

## A component loader

Next up is building a component loader, which is a pretty slick solution if you don't mind `<script></script>` tags. If you absolutely despise script tags though you should definitely stick around for the markup before making any final judgements as it leaves an incredibly minimal footprint.

The component loader has a lot more going on than data attributes, however it is much more robust in applications where there's a potential for lots of data being passed to the front end. Essentially we're going to be splitting things up into 3 parts:

1. Two global functions in the head that add components to an initialization queue and fire off all components stored in the initialization queue, respectively.
2. Script tags within the markup that fire off the loading function added to the head, passing along a component name and it's data.
3. A mechanism for firing off the function that iterates through the initialization queue and runs each components scripts on DOM ready.

This allows us to only run/trigger the components we actually need for this page and pass in as much data as we want, without worrying about Ajax calls. So let's start out with what we want our script tags to look like, then we can build the loading / initialization functions.

{% highlight html %}
<!--/* component.html */-->
<sly data-sly-use.component="path.to.backing.class.of.Component" />

<div class="namespace-component js-component">
<!--/* your component markup */-->
</div>

<script>
namespace.loadComponent('component-name', {
    trigger: '.js-component-trigger',
    field: '.js-component-field',
    prefix: '${component.optionPrefix @ context="scriptToken"}',
    data: '${component.optionData @ context="scriptToken"}'
});
</script>
{% endhighlight %}

Pretty spiffy. In this instance we've gone with a very similar setup to our last demo where we're manipulating a select field based on another select, except this time we're passing in all of our options as a giant JSON object (`${component.optionData}`) so we don't have to deal with Ajax calls. Instead, all our JS has to do is switch properties of a cached object to get new data.

Now that we know the syntax of our loader, it's time to write the loader itself. Because it needs to be instantiated and ready to go before the components begin getting parsed we need it to be created very early on, so somewhere in our `<head></head>`. We'll also need to establish a global namespace, initialization method, and a queue for our components.

{% highlight javascript %}
/*! Global Namespace Setup / namespace.headlibs.js */
(function (window) {
    var namespace = function () {
        // Create our queue
        var queue = [];
        return {
            // Create containers for our components and activated components
            components: {},
            activeComponents: {},
            /**
             * Pushes a component to the component queue
             * @param name String - name of the component
             * @param data Object - parameters to pass to the component
             */
            loadComponent: function loadComponent (name, data) {
                queue.push({
                    name: name,
                    properties: data
                });
            },
            /**
             * Iterates through the component queue and runs all queued scripts.
             * Will log an error to the console if a component can't be found.
             */
            runComponents: function runComponents () {
                var ns = this;
                // Iterate through our queue
                queue.filter(function filterQueue (c) {
                    // If the component name provided exists..
                    if (ns.components.hasOwnProperty(c.name)) {
                        // Instantiate the component and push it into our activeComponents reference
                        ns.activeComponents.push(new ns.components[c.name](c.properties));
                    } else {
                        // Otherwise, log an error to the console for further debugging
                        console.error('Component Loader: The "'+ c.name +'" component was not found.');
                    }
                });
            }
        };
    };

    window.namespace = namespace();
})(window, undefined);
{% endhighlight %}

[aem]: http://www.adobe.com/marketing-cloud/enterprise-content-management.html
[mvn]: https://maven.apache.org/
[npm]: https://www.npmjs.com/
[bs]: http://getbootstrap.com/
[foundation]: http://foundation.zurb.com/
[semantic]: http://semantic-ui.com/
[g]: http://gulpjs.com/
[iron]: https://github.com/jzeltman/iron
[Ruby]: https://www.ruby-lang.org/en/
[RVM]: https://rvm.io/
[sass]: http://sass-lang.com/
