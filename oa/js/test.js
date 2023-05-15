// removed by kai
// e.touchStart = function(b) {
    // e.startCoordinates = a.tap.pointerCoord(b);
    // a.tap.ignoreScrollStart(b) || (e.__isDown = !0, a.tap.containsOrIsTextInput(b.target) || "SELECT" === b.target.tagName ? e.__hasStarted = !1 : (e.__isSelectable = !0, e.__enableScrollY = !0, e.__hasStarted = !0, e.doTouchStart(k(b), b.timeStamp), e.options.el.hasAttribute("enable-parent-scroll") || b.preventDefault()))
// };
// removed by kai



if (!a.tap.ignoreScrollStart(b)) {
  if (!(e.__isDown = !0, a.tap.containsOrIsTextInput(b.target))) {
    if ("SELECT" === b.target.tagName) {
      e.__hasStarted = !1
    } else {
      // e.__isSelectable = !0, e.__enableScrollY = !0, e.__hasStarted = !0, e.doTouchStart(k(b), b.timeStamp), e.options.el.hasAttribute("enable-parent-scroll") || b.preventDefault()
      if (!(e.__isSelectable = !0, e.__enableScrollY = !0, e.__hasStarted = !0, e.doTouchStart(k(b), b.timeStamp), e.options.el.hasAttribute("enable-parent-scroll"))) {
        // b.preventDefault()
      }

    }
  }
}  



// removed by kai
e.touchStart = function(b) {
    e.startCoordinates = a.tap.pointerCoord(b);
//     // a.tap.ignoreScrollStart(b) || (e.__isDown = !0, a.tap.containsOrIsTextInput(b.target) || "SELECT" === b.target.tagName ? e.__hasStarted = !1 : (e.__isSelectable = !0, e.__enableScrollY = !0, e.__hasStarted = !0, e.doTouchStart(k(b), b.timeStamp), e.options.el.hasAttribute("enable-parent-scroll") || b.preventDefault()))
    if (!a.tap.ignoreScrollStart(b)) {
      if (!(e.__isDown = !0, a.tap.containsOrIsTextInput(b.target))) {
        if ("SELECT" === b.target.tagName) {
          console.log("if")
          e.__hasStarted = !1
        } else {
          console.log("else")  
          // e.__isSelectable = !0, e.__enableScrollY = !0, e.__hasStarted = !0, e.doTouchStart(k(b), b.timeStamp), e.options.el.hasAttribute("enable-parent-scroll") || b.preventDefault()
              if (!(e.__isSelectable = !0, e.__enableScrollY = !0, e.__hasStarted = !0, e.doTouchStart(k(b), b.timeStamp), e.options.el.hasAttribute("enable-parent-scroll"))) {
                // b.preventDefault()
              }
        }
      }
    }  
};
// removed by kai     