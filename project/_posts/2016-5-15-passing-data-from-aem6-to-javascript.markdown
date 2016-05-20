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
feature: js-data-aem-feature.png
featureico: js-data-aem-thumb.png
featurealt: AEM trying to make a sweet deal with JavaScript.
excerpt: As dynamic experiences become more popular, data will need to find its way from AEM to front end Javascript. Here are some good options for passing data along without headaches.
---

## Tl;dr
>- Use `data-*` attributes to pass along information to JS, in some cases passing along a data URI so you can obtain data via AJAX.
>- Build a _component loader_ that pushes the required components into an initialization queue as the page gets parsed.
>- Create a data scraper that does the same as the last point, but functions a little bit more automated.

We've all been there. There's some fancy component that requires numerous different view states, all including a ton of data. Do you just dump all of that into the DOM and hide the elements when they're not in use, potentially adding to your initial load time and bloating up your markup? Do you dynamically call for the new data every time the user uses the call to action, potentially slowing their real-time experience? More than likely there are approximately 4.3 billion different ways to handle this scenario (this is web development, after all), but not all of them work well in the realm of [AEM][aem].

So far in [AEM][aem] land I've tried quite a few different options for passing data to the front end, and some have worked far better than others. What I've personally used that have worked the best include using data attributes and AJAX calls either on demand or to snag and cache the rest of the data after first load, using some sort of _component loader_ that builds a queue of components to load at runtime then initializes them with data, and building a data scraper that, similar to the component loader, scrapes the page for key identifiers and then initializes each component with the data scraped from the page.

Which one is best? It's hard to say as each one shines in different scenarios, but none of them are subjectively perfect. Let's take a dive into each method, see how to implement it, and figure out when it makes sense to do so.

## Data attribute fun

First up let's take a look at utilizing `data-*` attributes to pass along data to Javascript. Data attributes are semantic, standards compliant and very popular ever since their inclusion in HTML5, so they're definitely a more obvious choice. In fact if you're already well-versed in data attributes you can feel free to jump down to the next method as this will probably end up just being a refresher.

Data attributes benefit in that they're almost effortless to implement (compared to the other options) and  semantically correct. Where they lose is large amounts of data and in some cases readability. For this reason data attributes are best paired with small amounts of simple data and a data URI that the Javascript can hit with a request for more yummy data.

So let's pretend we've got a form. When the user updates one select we need to grab some data based on that select, tack it onto the end of a data URI that the back end dev has provided and use that to grab some JSON data from AEM which we can then toss into a different select, with an authorable prefix.

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

We've added the element selectors for our elements onto our main component as data attributes, along with the data URI and option prefix that AEM has graciously given us after being configured by our content author. We now have direct access to all of these and can use them directly in our Javascript by accessing the data attributes of our component container via the `.data()` method with jQuery, or `.dataset` property with vanilla JS.

{% highlight javascript %}
/* component.js */
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

Next up is building a component loader, which is a pretty slick solution if you don't mind `<script></script>` tags. If you **do** absolutely despise script tags though, you should definitely stick around for the markup before making any final judgements as it leaves an super minimal footprint.

The component loader has a lot more going on than data attributes, however it is much more robust in applications where there's a potential for lots of data being passed to the front end. Essentially we're going to be splitting things up into 3 parts:

1. A global function in the head that adds components to an initialization queue, as well as one that fires off all components stored in that initialization queue.
2. Script tags within the markup that fire off the loader function in the head, passing along a component name and it's data.
3. A DOM ready event handler that triggers our component initialization function.

This allows us to only run/trigger the components we actually need for this page and pass in as much data as we want, without worrying about Ajax calls. So let's start out with what we want our script tags to look like, then we can build the loading / initialization functions.

### The Markup

{% highlight html %}
<!--/* component.html */-->
<sly data-sly-use.component="path.to.backing.class.of.Component" />

<div class="namespace-component" id="${resource.name}">
<!--/* your component markup */-->
</div>

<script>
namespace.loadComponent('component-name', {
    container: '#${resource.name @ context="scriptString"}',
    trigger: '.js-component-trigger',
    field: '.js-component-field',
    prefix: '${component.optionPrefix @ context="scriptString"}',
    jsonData: '${component.optionData @ context="scriptString"}'
});
</script>
{% endhighlight %}

Pretty spiffy. In this instance we've gone with a very similar setup to our last demo where we're manipulating a select field based on another select, except this time we're passing in all of our options as a giant JSON object (`${component.optionData}`) so we don't have to deal with Ajax calls. Instead, all our JS has to do is switch properties of a cached object to get new data. The only real bummer here is that to make sure we're targeting the correct instance of this component, we have to add an ID or some other identifier that matches up with only this DOM element (`${resource.name}`), which is not something we have to do when it comes to data attributes.

### The loader/runner

Now that we know the syntax of our loader, it's time to write the loader itself. Because it needs to be instantiated and ready to go before the components begin getting parsed, we need our loader to be created very early on, so somewhere in our `<head></head>`. We'll also need to establish a global namespace, initialization method, and a queue for our components.

{% highlight javascript linenos %}
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
                this.activeComponents = queue.map(function iterateQueue (c) {
                    // If the component name provided exists..
                    if (ns.components.hasOwnProperty(c.name)) {
                        // Instantiate the component and push it into our activeComponents reference
                        return new ns.components[c.name](c.properties);
                    } else {
                        // Otherwise, log an error to the console for further debugging
                        console.error('Component Loader: The "'+ c.name +'" component was not found.');
                    }
                });

                // Reset the queue
                queue = [];
            }
        };
    };

    window.namespace = namespace();
})(window, undefined);
{% endhighlight %}

Let's go over what's going on in this snippet:

1. Queue initialization: We create a private queue to hold our to-be-initialized components (line #5)
2. Container initialization: We set up containers for all of our component objects as well as our activated components (lines #8, 9)
3. loadComponent method: We create a function that gets two arguments, a name (string) corresponding to the name of our component script and data (object) to be passed to it, and pushes those into our private queue (lines #15-20)
4. runComponents method: We create a function that iterates through our queue, checks to verify the component exists, and will either run the component or log a not-found error to the console depending on the result of the verification check (lines #25-41)

In terms of code complexity, there really isn't much going on aside from array traversal and manipulation. Something worth noting is that the `activeComponents` property doesn't strictly need to be there unless you're going to need to access one of your components after it's been initialized for some reason (more than likely the only reason will be for debugging if something isn't working correctly), so if you were to omit that you could just remove the variable assignment and call it a day. Another improvement that could be made would be to pass in the DOM element ID as another argument outside of the options object, then in your `runComponents` method pass along a cached version of the DOM element to save a line inside of your component scripts.

As you can see from the snippet, this depends on storing your components inside of an accessible object and using some sort of initialization function with each component. This really shines when used in tandem with something like [Browserify](http://browserify.org/), where you can just require the component modules to generate your components object. Implementing via [Browserify](http://browserify.org/) does require having an external [Gulp](http://gulpjs.com/) build though, although if you're working on an increasingly intricate project this may already be implemented. You can see an example of what this coupled with Browserify would look like below.

{% highlight javascript %}
/* namespace.components.js, with Browserify */
// These are not strictly necessary in this instance, but are still good to
// include if something for some reason is being included manually elsewhere.
window.namespace = namespace || {};
window.namespace.components = namespace.components || {};

namespace.components = {
    linkedList: require('./components/linkedlist/linkedlist.js'),
    searchFilter: require('./components/searchfilter/searchfilter.js')
};

// linkedlist.js component
var linkedList = function (data) {
    // do something
};

module.exports = linkedList;
{% endhighlight %}

If you're ditching the added complexity of something like Browserify, this still works really well and is pretty straightforward. The only difference is you'll be adding the components to the components object manually in your scripts.

{% highlight javascript %}
/* linkedlist.js */
window.namespace = namespace || {};
window.namespace.components = namespace.components || {};

var linkedList = function (data) {
    // Do things
};

namespace.components.linkedList = linkedList;
{% endhighlight %}

The structures are very similar, but in one instance (Browserify) you're leaving the component scripts strictly module-related and bulk-importing them, where the standard method you're having to also verify existence of the globals then manually add the component to them. Technically speaking as long as we have the global declaration in the head, the globals verification is not strictly necessary (at least, the main `window.namespace = namespace || {}` part) but it's always a good idea to include it just to be safe. If one thing somehow tweaks the order it can lead to a lot of really awful debugging time.

Another thing to note is that even though in the example the components are functions, you're not absolutely tied down to this pattern. If you're more into the type of pattern where you have a plain object with tons of methods including an `.init()` method, that's totally doable as well it would just require the instantiation of the components in the `runComponents` declaration to be updated with the new pattern:

{% highlight javascript %}
this.activeComponents = queue.map(function iterateQueue (c) {
    // If the component name provided exists..
    if (ns.components.hasOwnProperty(c.name)) {
        // Instantiate the component and push it into our activeComponents reference
        return ns.components[c.name].init(c.properties);
    } else {
        // Otherwise, log an error to the console for further debugging
        console.error('Component Loader: The "'+ c.name +'" component was not found.');
    }
});
{% endhighlight %}

From there, all that's left to do is fire our `runComponents()` method somewhere in the footer, after all of our components have been loaded into the queue. As an added bonus, if you toss it into an on DOM ready event, all of the components loaded via the component loader will initialize.... well, on DOM ready. One less thing to worry about in your components!

## A component scraper

So this method is extremely similar to the component loader and takes queues from it, however it handles  loading differently. With this method our plan is to assign some sort of identifier to our script tags that helps the scraper detect them, along with a data attribute that specifies what component the script tag belongs to. Inside of the script tag we then toss a JSON object with all of our data that we need passed to the component. From there it's more or less the same, apart from our loader looking for the script tags rather than filling up a queue.

### The Markup

First up we'll look at the markup we're going for. This will just need to be a JSON object with all of the data tossed into it. This works best for large amounts of data passed into the front end as JSON then dumped straight into the script tag, ideally to be used as a data store once it makes its way into whatever JS function will be taking care of it. This works for smaller amounts of data being used for different things, but it's maybe not as clean when used in that way.

{% highlight html %}
<!--/* component.html */-->
<sly data-sly-use.component="path.to.your.component.Class" />

<div class="namespace-component">
    <!-- Do awesome things -->
</div>

<!--/* Example manually setting up props, including a json object as well */-->
<script class="js-scraper-data" data-component="linkedList" type="application/json">
{
    "id": "${component.id @ context='scriptToken'}",
    "moreUri": "${component.moreUri @ context='uri'}",
    "initialData": ${component.storeData @ context='unsafe'}
}
</script>

<!--/* Example with using a json object passed in from the back end */-->
<script class="js-scraper-data" data-component="linkedList" type="application/json">
${component.storeData @ context='unsafe'}
</script>
{% endhighlight %}

As mentioned earlier, it's pretty similar to the loader markup just sort of a different interpretation of it. The only bummer is that since we're already specifying this as JSON, we can't set the context of the JSON objects we're passing in to `scriptString` otherwise we'll run into parsing errors. This leaves us with only the `unsafe` context, which isn't ideal but it works.

In this case we're using the class `js-scraper-data` as our identifier so we can easily search for them from our scraper. We also add in a data attribute, `data-component`, to specify what component this script tag correlates with. From there it's just a matter of constructing a JSON object of the data we want to pass through to our component and it's ready to be scraped.

### The scraper

Our scraper, similar to our loader, is going to be made up by two parts: the data scraper and the component runner, and it differs in that it can be placed outside of the head in the main JS file and it will fire off the components as it gets them, rather than adding them to a queue.

{% highlight javascript linenos %}
// namespace.js
window.namespace = window.namespace || {};
namespace.components = window.namespace.components || {};

// Stores initialized components for debugging
namespace.activeComponents = [];

/**
 * Iterates through the identified script tags, parses them, then passes
 * the data along to runComponent for initialization and storage.
 */
namespace.scrapeComponents = function () {
    var scripts = document.querySelectorAll('.js-scraper-data'),
        numComponents = scripts.length;

    for (var i = 0; i < numComponents; ++i) {
        var name = scripts[i].dataset.component,
            data = JSON.parse(scripts[i].innerText);

        this.runComponent(name, data);
    }
};

/**
 * Initializes and stores the component passed to it in activeComponents.
 * @param component String - name of the component
 * @param data Object - parameters to pass to the component
 */
namespace.runComponent = function (component, data) {
    if (this.components.hasOwnProperty(component)) {
        this.activeComponents.push( this.components[component](data) );
    } else {
        console.error('Component Scraper: Could not find component', component);
    }
};

$(document).on('ready', function() {
    namespace.scrapeComponents();
    // Do other cool global stuff
});
{% endhighlight %}

The functions themselves should look similar by now, but as noted earlier the main way we get the components  has been swapped. We no longer have a queue, and while iterating through each instance of our identifier we immediately parse and hand it off to be initialized (lines #15-19).

This sort of adjustment does mean we have to make sure that we call our `namespace.scrapeComponents()` method **AFTER** we've stored all of our components accessibly. You _could_ keep this in the head and follow a similar structure to the component loader, but that would mean you would have to include the methods and namespace setup separately and in the headlibs rather than with the rest of your code.

## Final thoughts

The three methods included in this post are all unique in their own way and all have their own strengths and weaknesses. Data attributes work absolutely great for the majority of situations, but can be ugly and are not suitable what-so-ever for large amounts of JSON data; the component loader works great for all situations but can be incredibly heavy-handed and unnecessary for simple components; the component scraper, like the component loader, works great for when you have a large amount of JSON data that needs to get passed along to the Javascript but again is complete overkill for the majority of simple components.

Which is the best solution? That depends fully on the project and the type of data that needs to be moved around, but hopefully these give you some ideas to build off of to come up with the perfect solution for your next project.

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
