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
    return Array.prototype.forEach.call($els, function($el, i) {
      $el.addEventListener("click", handleClick);
    });
  }
}());

// CoffeeScript
/**
expandItem = (cls = "slide-in") ->
    $els = document.getElementsByClassName 'js-expand'

    handleClick = (e) ->
        if e.target != this
          currTar = e.target.parentElement
          currTar = currTar.parentElement while currTar != this
          $tar = document.querySelector currTar.dataset.expand
        else
          $tar = document.querySelector e.target.dataset.expand
        $tar.classList.toggle cls


    Array.prototype.forEach.call $els, ($el, i) ->
        $el.addEventListener "click", handleClick
*/
