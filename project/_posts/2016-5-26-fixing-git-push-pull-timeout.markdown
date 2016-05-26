---
layout: post
title:  "Fixing git push/pull timing out"
date:   2016-5-26 15:02:30
category: development
tags:
  - git
  - github
  - git issues
  - crying yourself to sleep
feature: git-timeout/feature.png
featureico: git-timeout/thumbnail.png
featurealt: The trauma. The despair.
excerpt: Here's what I did to fix a random git timeout that prevented me from pushing or pulling code for hours.
---

There's nothing worse than losing precious development time thanks to some random sporadic tooling error. It's amazing how difficult it was to find an actual fix for this, although due to the network-related nature of the issue I can imagine there are at least 400 million different fixes and causes.

Out of the blue I was unable to pull or push to any repos. Since I use SSH with Github, I was able to circumvent the issue briefly by changing the origin to https then providing my user/pass when pushing and pulling but all of a sudden that stopped working completely as well. What gives?

So first up, the error. After remaining idle for quite a while, the command would fail with the following:

{% highlight bash %}
$ git push
ssh: connect to host github.com port 22: Operation timed out
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.
{% endhighlight %}

Alright... After some Googlin' I was able to find a [Stack overflow post](http://stackoverflow.com/questions/15589682/ssh-connect-to-host-github-com-port-22-connection-timed-out) mentioning the same issue, with the accepted answer saying to change the repo URL from SSH to https. That was a no-go, but the first command to double check came in handy:

{% highlight shell %}
$ ssh -T git@github.com
{% endhighlight %}

The post mentioned that should timeout, and it did. However with my repo already on https and it still not working, I had to explore other avenues to fix it. After restarting 4 times with no luck I did more searching and found myself on the following page on [Github Help](https://help.github.com): [Using SSH over the HTTPS port](https://help.github.com/articles/using-ssh-over-the-https-port/).

Hot. More things to try. The first was an altered version of the first command that essentially ran the same check but through a different port. I was supposed to receive a friendly success message back, so I went ahead and gave it a go:

{% highlight plaintext %}
$ ssh -T -p 443 git@ssh.github.com
Hi aesinv! You've successfully authenticated, but GitHub does not provide shell access.
{% endhighlight %}

It was like finding a radio linked directly to the forrest rangers after being lost in the forrest for 2 weeks, it was absolutely beautiful. I went ahead and followed the second step listed on the article, which was to update my ssh config to route github connections through the HTTPS port.

{% highlight conf %}
# ~/.ssh/config
Host github.com
    Hostname ssh.github.com
    Port 443
{% endhighlight %}

Now for the moment of truth. To test the routing was complete I ran the same command I had run before, `$ ssh -T git@github.com`, and saw the same friendly greeting I had before. Hope swelled throughout my being. Then I tried pushing the changes that were waiting politely to be transported safely over to the repository, and what I was greeted with was a truly incredibly sight to behold.

{% highlight shell %}
$ git push
Warning: Permanently added the RSA host key for IP address '[192.30.252.151]:443' to the list of known hosts.
Counting objects: 59, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (48/48), done.
Writing objects: 100% (59/59), 6.54 KiB | 0 bytes/s, done.
Total 59 (delta 28), reused 0 (delta 0)
To git@github.com:Organization/repo.git
   2a7b8b5..0c8a46c  feature-hero -> feature-hero
{% endhighlight %}

I may have cried a tear of happiness.

Hopefully this can help someone else who gets tormented by this awful issue. I still am not sure what exactly caused it as things were working just great yesterday, but I'm glad I was able to find a fix. It took nearly 3 hours, but we can gloss over that.
