var scrollOffset = (function() {
  var numEls,
      $els    = document.getElementsByClassName('js-scroll-offset')[0],
      $banner = document.getElementsByClassName('feature-header')[0],
      $header = document.getElementsByClassName('site-header')[0],
      $nav    = document.getElementById('category-nav');

  if (typeof $els !== "undefined") {
    if ($els.hasOwnProperty('length')) {
      numEls = $els.length;
    } else {
      numEls = 1;
    }
  } else {
    numEls = 0;
  }

  var getStart = function getStart () {
    return $header.offsetHeight + $nav.offsetHeight;
  };

  var getEnd = function getEnd () {
    return getStart() + $banner.offsetHeight;
  };

  var calcDistance = function calcDistance(distance) {
    var top   = window.pageYOffset || document.documentElement.scrollTop,
        start = getStart(),
        end   = getEnd();

    return ((top - start) / (end - start)) * distance;
  };

  var handleScroll = function handleScroll() {
    var top = window.pageYOffset || document.documentElement.scrollTop;

    if (top < getStart()) {
        if (getComputedStyle($els).transform == 'matrix(1, 0, 0, 1, 0, 0)') return;
        else return $els.style.transform = 'translateY(0px)';
    }

    if (top > getEnd()) {
      if (getComputedStyle($els).transform == 'matrix(1, 0, 0, 1, 0, '+$els.dataset.distance+')') return;
      else return $els.style.transform = 'translateY('+$els.dataset.distance+'px)';
    }

    if (numEls > 1) {
        $els.style.transform = 'translateY('+calcDistance($els.dataset.distance)+'px';
        return;
    } else {
      $els.style.transform = 'translateY('+calcDistance($els.dataset.distance)+'px';
      return;
    }
  };

  if (numEls > 0) {
    document.onscroll = handleScroll;
  }
}());
