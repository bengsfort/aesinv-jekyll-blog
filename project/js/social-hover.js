var socialHover = (function() {
  var $list = document.querySelector('.js-social-list'),
    $children = $list.children,
    $target = document.querySelector($list.dataset.socialHoverTarget) || document.querySelector($list.getAttribute('data-social-hover-target')),
    transClass = 'in',
    animating = false;

  function hoverIn (e) {
    if (!animating)  {
      animating = true;
      var userName = e.target.dataset.socialUser || e.target.getAttribute('data-social-user');

      // Change data attr
      if ($target.dataset) { $target.dataset.socialName = userName; }
      else { $target.setAttribute('data-social-name', userName); }

      // Add transition class
      if ($target.classList) { $target.classList.add(transClass); }
      else { $target.className += ' ' + transClass; }
    }
    else {
      setTimeout(hoverIn, 375, e);
    }
  }

  function handleTransitionEnd(e) {
    if ($target.dataset) { delete $target.dataset.socialName; }
    else { $target.removeAttribute('data-social-name'); }
    $target.removeEventListener(e.type, arguments.callee);
    animating = false;
  }

  function hoverOut (e) {
    animating = true;
    if ($target.classList) { $target.classList.remove(transClass); }
    else { $target.className = $target.className.replace(new RegExp('(^|\\b)' + transClass.split(' ').join('|') + '(\\b|$)', 'gi'), ' '); }

    // delete data attr
    var navigatorsProperties=['transitionend','OTransitionEnd','webkitTransitionEnd'];
        for(var i in navigatorsProperties) {
            $target.addEventListener(navigatorsProperties[i], handleTransitionEnd, false);
        }
  }

  function bindHoverEvents() {
    Array.prototype.forEach.call($children, function(el, i) {
      el.addEventListener("mouseenter", hoverIn);
      el.addEventListener("mouseleave", hoverOut);
    });
  }

  document.onreadystatechange = function() {
    if (document.readyState == "complete")
      bindHoverEvents();
  };
})();