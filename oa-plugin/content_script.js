(function() {

  // while (typeof angular == 'undefined');;

  var app = angular.module('indiplatform.domino');
  app.config(['$provide', function($provide) {
    $provide.decorator('$imNotesName', [
      '$delegate',
      function $imNotesNameDecorator($delegate) {

        function _toRealName(str) {
          if (/\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]/g.test(str)) {
            return str;
          } else {
            return _toCN(str).replace(/\d+/, "") + _extractStatus(str);
          }
          // someFn.apply($delegate, str);
        }

        function _toCN(str) {
          return _toABBR(str).split("/")[0];
        }

        function _toABBR(str) {
          return str.replace(/(CN|OU|O|C)=/gi, "");
        }

        function _extractStatus(str) {
          return str.indexOf("【") > -1 ? str.slice(str.indexOf("【"), str.indexOf("】") + 1) : "";
        }

        $delegate.toRealName = _toRealName;
        console.log('$imNotesName.toRealName() has been overrided.');
        return $delegate;
      }])
  }])


})();