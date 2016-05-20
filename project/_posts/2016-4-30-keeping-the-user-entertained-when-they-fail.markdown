---
layout: post
title:  "Game Dev Log: Keeping the player entertained when they fail"
date:   2016-04-30 21:22:31
category: game dev
tags:
  - unity
  - javascript
  - device motion
  - experimental tech
  - game development
featureOffset: -50px
featureIsVideo: true
featureVidSlugs: entertaining-player-when-they-fail
feature: entertaining-player-when-they-fail.png
featureico: entertaining-player-when-they-fail.gif
featurealt: The completed respawn overlay.
excerpt: I really want to polish off this game as much as possible, so today we're taking a look at what happens when the user falls off the current stage into the oblivion.
---

I'm quickly discovering that games are just like really complex or unmaintained websites: as you progress you quickly find that there are a lot more scenarios and screens you need to deal with that never even crossed your mind when you started. For me one of these was _"Wait, what happens when the player falls off a platform?"_ I knew it was always something that was going to happen, especially considering the game is inspired by _Super Monkey Ball_, but I had never actually taken the time to figure out what would happen on the screen.

Considering I want to polish the game as much as possible and have it stand out from other mobile games, some hard cut back to the spawn point was way out of the question. Since the playable character is literally just a ball there's really no fancy animations I can have him do. With that in mind, I came up with the idea of the camera stopping shortly after falling off but continuing to look in the direction of the player, wherever he is, and then making up for the lack of animations with some UI overlay.

## Dealing with the physics
First I had to actually write in the player respawn scripts, which turned out to be the most difficult by far. After creating some large triggers underneath the stage area I wound up wasting a good few hours trying to figure out why my collision events wouldn't fire, but discovered that I hilariously had my console filtered to error messages only. After that revelation things didn't get easier though, as it turns out updating a [Rigidbody](http://docs.unity3d.com/ScriptReference/Rigidbody.html)'s position in Unity when it's under heavy force is more involved than simply updating it's coordinates.

Aside from updating positions, it turns out you also need to zero out the objects [velocity](http://docs.unity3d.com/ScriptReference/Rigidbody-velocity.html) so they don't respawn and continue to fly through the air at supersonic speeds. Furthermore, it turns out Unity has a quirk where you also have to deactivate / activate the [Rigidbody](http://docs.unity3d.com/ScriptReference/Rigidbody.html). Without this hard reset the rigidbody can experience some really bizarre and jerky movement patterns after it's been repositioned absolutely via transform rather than physics.

{% highlight javascript %}
// Pause the object
rb.velocity = Vector3.zero;
rb.angularVelocity = Vector3.zero;
rb.useGravity = false;
rb.isKinematic = true;

// Update to the new position
transform.position = respawnPoint;
origin.transform.rotation = Quaternion.identity;

// Unpause the object, including a hard activate reset
gameObject.SetActive(false);
gameObject.SetActive(true);
rb.useGravity = true;
rb.isKinematic = false;
{% endhighlight %}

It's not the prettiest code, but it works flawlessly. Plus as an added bonus I didn't really have to do any more legwork for the camera and player origin since they're directly relational to the position of the player object. I wound up breaking these blocks up into their own separate public functions so I could also re-use them for when I implement pausing the game (which is already implemented in a very rudimentary state as a result of this).

{% highlight javascript %}
public function pause() {
	// pause the object
	rb.velocity = Vector3.zero;
	rb.angularVelocity = Vector3.zero;
	rb.useGravity = false;
	rb.isKinematic = true;
}

public function unpause() {
	// unpause the object, including a hard activate reset
	gameObject.SetActive(false);
	gameObject.SetActive(true);
	rb.useGravity = true;
	rb.isKinematic = false;
}

public function respawn() {
	pause();

	// Update to the new position
	transform.position = respawnPoint;
	origin.transform.rotation = Quaternion.identity;

	unpause();
}
{% endhighlight %}

## Freezing the camera until respawn
Getting the detached camera functionality wound up being far easier than I anticipated, however it required quite a bit of refactoring of my main camera script. I ended up creating a state property that would dictate what the camera should be doing at that moment; then created methods for each state. Detaching is essentially just unbinding the position from the players position and continuing to fire [LookAt](http://docs.unity3d.com/ScriptReference/Transform.LookAt.html) so the camera will maintain its gaze on the user as he plummets to certain doom.

## Creating an overlay
There were two elements I to the overlay that I really wanted to capture:

1. An amusing message that would (hopefully) keep the user entertained.
2. A similarly amusing image of our main _character_ looking battered and bruised.

![The completed overlay](/img/game-respawn/respawn-screen.png)

### Amusing variety
Keeping with the idea of details, I didn't want to just toss in a static text field and be done with it. Having an array of potential messages and randomly choosing one to show to the user seemed far more appealing, so that's what I went ahead and did. That way there would be a sense of variety and spontaneity, rather than a predictable and boring preset message.

Thanks to Unity's public variable configuration this was cake. I just set a public variable to be an array of Strings (`String[]`), then in my `Start()` method have it generate a random number between zero and the length of the array, using that number to extract a message from the array and apply it to the text field. Done!

### Adding the character into the mix
Creating a variant of the main character to take a render of was extremely fun, and surprisingly didn't take too long. I took his base texture and created an alternate version with far more bummed out eyes and tons of scratches/bruises all over him, tossed it into Unity and snagged a screenshot of him in front of a green cube so I could toss that into Photoshop and get a clean transparent picture.

![The result of the character render](/img/game-respawn/injured-player-resized.png)

### Animating and finishing up UI
In case you haven't picked up on this yet, but I think static is boring. The more moving things the better! It was time to animate this screen for extra fancy points, so I loaded up the character image into Unity and opened up the [Animator](http://docs.unity3d.com/Manual/class-Animator.html) window for the first time on this project. I actually really enjoyed using it, it reminded me a lot of my Flash and video editing days way back when so it was super easy and quick to get up-to-speed with.

I wound up not having to use the states feature at all as there was only one state, and I was using the animations as transitions for the game objects when first activated. The only snag was making sure to turn off looping, which wasn't as apparent as I would have expected it to be.

### Putting it all together
While bundling everything together wasn't necessarily difficult it did require quite a large amount of refactoring so I could get everything centralized. This involved creating a lot of public methods and finally busting out my `LevelController` script which I'm using for controlling and maintaining level-related data.

I cached the player/camera/timer objects and controllers in my level controller and started thinking up exactly what would need to happen so I could start creating public methods in the respective controllers. I wound up with the following:

1. Pause the timer (`Timer Controller`)
2. Lock the camera (`Camera Controller`)
3. Activate the overlay (`Level Controller`)
4. Pause, reset, and respawn the player (`Player Controller`)
5. Re-bind the camera to the player (`Camera Controller`)
6. Restart the timer (`Timer Controller`)

Since this is all pretty cut and dry and taking easy functionality and tossing it into public functions, we'll just focus on the interesting bits of the level controller.

Whenever the player hits the out of bounds collision trigger, I made the object fire off the `playerFell()` method of the Level Controller, which is as follows:

{% highlight javascript %}
public function playerFell() {
	// Freeze the camera and pause the timer
	cameraController.freezeCamera();
	gameTimer.stopTimer();

	// Load the overlay from resources and toss it into the interface canvas
	var fellOverlay : GameObject = Instantiate(Resources.Load("fell-screen", GameObject));
	fellOverlay.transform.SetParent(canvas.transform, false);

	// Let's let the player contemplate what went wrong
	yield WaitForSeconds(3.5);

	// Remove the overlay and restart everything
	Destroy(fellOverlay);
	playerController.respawn();
	cameraController.unfreezeCamera();
	gameTimer.Restart();
}
{% endhighlight %}

Essentially, we're freezing the state of the game for 3.5 seconds to load and show the "you failed" overlay then resetting everything back to the original positions/values when the level started. As we saw up when we were fooling with the player controller above, there's quite a bit more going on however since everything is isolated into their own public methods it makes the main script a lot more easy to comprehend. The most interesting thing here is that I decided to load the overlay as a prefabbed resource. This is because [resources don't take up memory on mobile devices until instantiated](https://youtu.be/vnF9YEm_pxk?t=29m28s), so the overlay isn't hogging any necessary memory when it's not active.

<div class="bg-video-wrap" style="background-image: url('/img/entertaining-player-when-they-fail.gif');">
  <video class="bg-video-player" autoplay loop>
    <source src="/img/videos/entertaining-player-when-they-fail.mp4"  type="video/mp4; codecs=avc1.42E01E,mp4a.40.2">
    <source src="/img/videos/entertaining-player-when-they-fail.webm" type="video/webm; codecs=vp8,vorbis">
  </video>
</div>

That's all for this episode of the dev log. I hope you enjoyed it, make sure to check out the other parts below:

1. From concept to reality
2. Trying a new look
3. Another player package refactor
4. Keeping the user entertained when they fail
