(function() {
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

	return bindHoverEvents;
})();

var expandItem = (function(cls) {
  var $els = document.getElementsByClassName('js-expand');
  if (typeof cls === "undefined") cls = "slide-in";

  function handleClick(e) {
      e.preventDefault();
      var $tar;
      if (e.target !== this) {
        var currTar = e.target.parentElement;
        while (currTar !== this) {
          currTar = currTar.parentElement;
        }
        $tar = document.querySelector(currTar.dataset.expand);
      } else {
        $tar = document.querySelector(e.target.dataset.expand);
      }
      $tar.classList.toggle(cls);
  }
  if ($els !== null) {
    if ($els.hasOwnProperty(length)) {
      return Array.prototype.forEach.call($els, function($el, i) {
        $el.addEventListener("click", handleClick);
      });
    } else {
      return $els.addEventListener("click", handleClick);
    }
  }
}());

// var maskBody = function() {
//   console.log(expandItem);
//   var $els = document.querySelector('.js-mask');

//   function handleClick(e) {
//     e.preventDefault();
//     var m = document.getElementsByClassName('body-mask');
//     if (m.length > 0) return removeMask();
//     else return addMask();
//   }

//   function addMask() {
//     var m = document.createElement('div'), e;
//     m.className = 'body-mask js-mask js-expand';
//     m.dataset.expand = 'body';
//     document.getElementsByTagName('BODY')[0].appendChild(m);
//     console.log(expandItem);
//     e = expandItem();
//     m.addEventListener('click', handleClick);
//     return true;
//   }

//   function removeMask() {
//     var m = document.getElementsByClassName('body-mask')[0];
//     m.parentNode.removeChild(m);
//     return true;
//   }

//   if ($els !== null) {
//     if ($els.hasOwnProperty(length)) {
//       return Array.prototype.forEach.call($els, function($el, i) {
//         $el.addEventListener("click", handleClick);
//       });
//     } else {
//       return $els.addEventListener("click", handleClick);
//     }
//   }
// }();

document.onreadystatechange = function() {
	if (document.readyState == "complete") {
		socialHover();
	}
};

})();
