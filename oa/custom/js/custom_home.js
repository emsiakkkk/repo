angular.module('duban.home',['ionic', 'duban.home.services', 'duban.home.controllers'])
.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('attention', {
    url: '/attention',
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/home/attention.html',
        controller: 'attentionCtrl'
      }
    }
  })
  .state('duban', {
      //abstract: true,
      url: "/duban",
      views: {
        'main-view':{
          templateUrl: '../_custom/template/duban.html',
          controller: 'dubanCtrl'
        }
      }
    })
  .state('haddone', {
    url: '/haddone',
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/home/haddone.html',
        controller: 'haddoneCtrl'
      }
    }
  })
 .state('tixing', {
    url: '/tixing',
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/home/tixing.html',
        controller: 'tixingCtrl'
      }
    }
  })
  .state('draft', {
    url: '/draft',
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/home/draft.html',
        controller: 'draftCtrl'
      }
    }
  })
  .state('duban.dhome', {
    url: '/dhome',
    cache: true,
    views: {
      'd-home': {
        templateUrl: '../_custom/app-duban/home/home.html',
        controller: 'dhomeCtrl'
      }
    }
  })
  .state('dhome', {
    url: '/dhome',
    cache: true,
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/home/home.html',
        controller: 'dhomeCtrl'
      }
    }
  })
})
.run(function(validatorService,$q,$rootScope,$location,$ionicPlatform,$ionicHistory,pushInfoService,indiConfig,$imCustomAction){
    /* $ionicPlatform.registerBackButtonAction(function (e) {
      if($location.$$path == "/duban/dhome"){
        ionic.Platform.exitApp();
      }else{
        $ionicHistory.goBack(); 
      }
      return false;
    }, 101);

    $rootScope.oldDatabase = true
    $rootScope.$on('workspace.statenotfound', function(evt,param) {
      if(!localStorage.getItem("usetab")||localStorage.getItem("usetab")=="false"){
        param.setHomeUrl("/duban/dhome");
      } 
    }); */
    //点击更多里的扩展按钮
    $rootScope.$on("$im.webflow.actionbtn.click",function(evt,data,scope){
      if(data.id=="btnTaskFrBj"){
        $imCustomAction.frbj();
      }
      else if(data.id=="btnTaskQrBj"){
        $imCustomAction.qrbj();
      }
    })
    //消息推送点击更换
    /* $rootScope.$on("$im.common.redirectService.beforeGoto", function(evt,data) {
      if(data.indexOf("/") === 0){
          return
      }
      evt.preventDefault();
      if(indiConfig.modules.workspace.useTabNavigation()){
        $state.go("duban.dhome")
      }
      else{
        $state.go("dhome")
      }
    }); */
})
/* .config(function (indiConfigProvider,$stateProvider,$ionicConfigProvider,$urlRouterProvider) {
      indiConfigProvider.modules.mail.disable(true);
      indiConfigProvider.modules.toread.disable(true);
      $ionicConfigProvider.views.swipeBackEnabled(false)
      indiConfigProvider.modules.startProcess.disable(true);
      if(!localStorage.getItem("usetab")){
              localStorage.setItem("usetab",false);//默认不启用tab页
      }
}) */
angular.module('duban.home.services', ['ngResource','x2js'])
.factory('homeService', function(CONFIG,$imDominoSoap,x2js,$resource){
  return{
    todolist : function(callback,type,name,start,count,query){
      var url = "/indishare/indiwsleaf.nsf/wsGetTodolist?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        "getDBSYListByType",{
          "type" : type,
          "personname" : name,
          "start" : start,
          "docnum" : count,
          "query" : query
        }
        //{loading:true}
      ).then(function(datas){
        if(datas.data.DATAS.Total == 0){
           callback(datas.data)
           return 
        }
        if(!angular.isArray(datas.data.DATAS.ITEM)){
          datas.data.DATAS.ITEM[0]= datas.data.DATAS.ITEM;
        }
        angular.forEach(datas.data.DATAS.ITEM,function(item){
	if(item.fldFromDB_jy !== undefined){
          if(item.fldFromDB_jy.indexOf("jyrwzx.nsf")!=-1){
            if(item.fldflow_jy !=0  && item.flownum_jy!=9999){
              item.lujing = "#/webflow/" + item.flowurl + "/" + item.flowunid ;
            }else{
              item.lujing = "#/oneMission/" + item.flowunid +"-" + item.subform;
            }
          }else{
            item.lujing = "#/webflow/" + item.flowurl + "/" + item.flowunid ;
          }
		}
        })
     
        callback(datas.data)
      }) 
    },
    remindlist : function(callback,type,name,start,count,query,app){
      var url = '/'+ app + "/jywebservice.nsf/wsGetTiXingList?WSDL";
      return $imDominoSoap.invoke(
        url,
        "getTiXingListByType",{
          "type" : type,
          "personname" : name,
          "start" : start,
          "docnum" : count,
          "query" : query
        }
        //{loading:true}
      ).success(function(datas){
        callback(datas)
      })
    }
  }
});

angular.module('duban.home.controllers', ['ngResource','x2js'])
.controller('dhomeCtrl', function($rootScope,$scope,homeService,$location,$ionicTabsDelegate,$imHistory){
  //刷新列表判断类型
  $scope.whatSelect = 'todo';
  $scope.wSelect = function(name){
    $scope.whatSelect = name;
  }
  $scope.initialized2 = false;
  $scope.getmore2 = false;
  $scope.qq = function(){
    $rootScope.myRefresh = true
  }
  $scope.getRemind = function(){
    var start = 1;
    var depinfo;
    if($scope.context.userinfo.custom.maindepinfo_jygl.host_jygl){
    	depinfo = $scope.context.userinfo.custom.maindepinfo_jygl;
    }else if($scope.context.userinfo.custom.otherdepinfo_jygl[0].host_jygl){
    	depinfo = $scope.context.userinfo.custom.otherdepinfo_jygl[0];
    }
	var host_jygl_port = depinfo.port_jygl;
	if(host_jygl_port!="" && host_jygl_port!="80"){
		host_jygl_port = ":"+host_jygl_port;
	}else{
		host_jygl_port = "";
	}
	var href_jy = 'http/'+depinfo.host_jygl+host_jygl_port+"/"+depinfo.appname_jygl;
   // var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    homeService.remindlist(function(data){
      if(data==''){
        $scope.remind = [];
        $scope.initialized2 = true;
        $scope.$broadcast('scroll.refreshComplete');
        return  
      }
      if(angular.isArray(data.DATAS.ITEM)){
        $scope.remind = data.DATAS.ITEM;
      }else{
        $scope.remind = [];
        if(data.DATAS.ITEM){
          $scope.remind[0] = data.DATAS.ITEM;  
        }
      }
      if($scope.remind.length>=20){
        $scope.getmore2 = true;
      }
      if(!$scope.initialized2){
        $scope.initialized2 = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },1,$scope.context.userinfo.userid,1,20,'',href_jy);
  }
  $scope.loadMore2 = function() {//下拉加载更多
    var start = 1;
	var depinfo;
    if($scope.context.userinfo.custom.maindepinfo_jygl.host_jygl){
    	depinfo = $scope.context.userinfo.custom.maindepinfo_jygl;
    }else if($scope.context.userinfo.custom.otherdepinfo_jygl[0].host_jygl){
    	depinfo = $scope.context.userinfo.custom.otherdepinfo_jygl[0];
    }
	var host_jygl_port = depinfo.port_jygl;
	if(host_jygl_port!="" && host_jygl_port!="80"){
		host_jygl_port = ":"+host_jygl_port;
	}else{
		host_jygl_port = "";
	}
	var href_jy = 'http/'+depinfo.host_jygl+host_jygl_port+"/"+depinfo.appname_jygl;
    //var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    if($scope.remind){
      start = $scope.remind.length + 1;
    }
    homeService.remindlist(function(data){
      if($scope.remind && $scope.remind.length>0){
        $scope.remind = $scope.remind.concat(data.DATAS.ITEM)

      }else{
        $scope.remind = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length<20){
        $scope.getmore2 = false;
      }
      if(!$scope.initialized2){
        $scope.initialized2 = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },1,$scope.context.userinfo.userid,start,20,'',href_jy);
  };
  $scope.getRemind();
  //获取待办
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getTodo = function(){
    var start = 1;
    homeService.todolist(function(data){
      function isEmptyObject(O){
    for (var x in O){
       return false;
    }
       return true;
    }
    if(isEmptyObject(data)){
      $scope.initialized = true;
      $scope.todo = [];
      $scope.$broadcast('scroll.refreshComplete');
      return
    }
      else{
        if(data.DATAS.Total == 0||data.DATAS.ITEM.length==0){
          if(!$scope.initialized){
            $scope.initialized = true;
          }
          $scope.todo = [];
          $scope.$broadcast('scroll.refreshComplete');
          return
      }
      if(angular.isArray(data.DATAS.ITEM)){
         $scope.todo = data.DATAS.ITEM;
      }else{
         $scope.todo = [];
         $scope.todo[0] = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length>=20){
         $scope.getmore = true;
      }
      if(!$scope.initialized){
         $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
     }
    },0,$scope.context.userinfo.userid,start,20,'');
  }
  $scope.loadMore = function() {//下拉加载更多
    var start = 1;
    if($scope.todo){
      start = $scope.todo.length + 1;
    }
    homeService.todolist(function(data){
      if($scope.todo && $scope.todo.length>0){
        $scope.todo = $scope.todo.concat(data.DATAS.ITEM)
      }else{
        $scope.todo = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },0,$scope.context.userinfo.userid,start,20,'');
  };
  $scope.getTodo();
})
//提醒
.controller('tixingCtrl', function($rootScope,$scope,homeService,$location,$ionicTabsDelegate,$imHistory){
  //刷新列表判断类型
  $scope.whatSelect = 'remind';
  $scope.wSelect = function(name){
    $scope.whatSelect = name;
  }
  $scope.initialized2 = false;
  $scope.getmore2 = false;
  $scope.qq = function(){
    $rootScope.myRefresh = true
  }
  $scope.getRemind = function(){
    var start = 1;
			var host_jygl_port = $scope.context.userinfo.custom.maindepinfo_jygl.port_jygl;
	if(host_jygl_port!="" && host_jygl_port!="80"){
		host_jygl_port = ":"+host_jygl_port;
	}else{
		host_jygl_port = "";
	}
	var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+host_jygl_port+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
   // var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    homeService.remindlist(function(data){
      if(data==''){
        $scope.remind = [];
        $scope.initialized2 = true;
        $scope.$broadcast('scroll.refreshComplete');
        return  
      }
      if(angular.isArray(data.DATAS.ITEM)){
        $scope.remind = data.DATAS.ITEM;
      }else{
        $scope.remind = [];
        if(data.DATAS.ITEM){
          $scope.remind[0] = data.DATAS.ITEM;  
        }
      }
      if($scope.remind.length>=20){
        $scope.getmore2 = true;
      }
      if(!$scope.initialized2){
        $scope.initialized2 = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },1,$scope.context.userinfo.userid,1,20,'',href_jy);
  }
  $scope.loadMore2 = function() {//下拉加载更多
    var start = 1;
		var host_jygl_port = $scope.context.userinfo.custom.maindepinfo_jygl.port_jygl;
	if(host_jygl_port!="" && host_jygl_port!="80"){
		host_jygl_port = ":"+host_jygl_port;
	}else{
		host_jygl_port = "";
	}
	 var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+host_jygl_port+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    //var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    if($scope.remind){
      start = $scope.remind.length + 1;
    }
    homeService.remindlist(function(data){
      if($scope.remind && $scope.remind.length>0){
        $scope.remind = $scope.remind.concat(data.DATAS.ITEM)

      }else{
        $scope.remind = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length<20){
        $scope.getmore2 = false;
      }
      if(!$scope.initialized2){
        $scope.initialized2 = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },1,$scope.context.userinfo.userid,start,20,'',href_jy);
  };
  $scope.getRemind();
  //获取待办
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getTodo = function(){
    var start = 1;
    homeService.todolist(function(data){
      function isEmptyObject(O){
    for (var x in O){
       return false;
    }
       return true;
    }
    if(isEmptyObject(data)){
      $scope.initialized = true;
      $scope.todo = [];
      $scope.$broadcast('scroll.refreshComplete');
      return
    }
      else{
        if(data.DATAS.Total == 0||data.DATAS.ITEM.length==0){
          if(!$scope.initialized){
            $scope.initialized = true;
          }
          $scope.todo = [];
          $scope.$broadcast('scroll.refreshComplete');
          return
      }
      if(angular.isArray(data.DATAS.ITEM)){
         $scope.todo = data.DATAS.ITEM;
      }else{
         $scope.todo = [];
         $scope.todo[0] = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length>=20){
         $scope.getmore = true;
      }
      if(!$scope.initialized){
         $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
     }
    },0,$scope.context.userinfo.userid,start,20,'');
  }
  $scope.loadMore = function() {//下拉加载更多
    var start = 1;
    if($scope.todo){
      start = $scope.todo.length + 1;
    }
    homeService.todolist(function(data){
      if($scope.todo && $scope.todo.length>0){
        $scope.todo = $scope.todo.concat(data.DATAS.ITEM)
      }else{
        $scope.todo = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },0,$scope.context.userinfo.userid,start,20,'');
  };
  $scope.getTodo();
})
//已办
.controller('haddoneCtrl',function($scope,homeService){
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getTodo = function(){
    var start = 1;
    homeService.todolist(function(data){
      if(data.DATAS.Total == 0){
        if(!$scope.initialized){
          $scope.initialized = true;
        }
        return
      }
      if(angular.isArray(data.DATAS.ITEM)){
        $scope.todo = data.DATAS.ITEM;
      }else{
        $scope.todo = [];
        $scope.todo[0] = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length>=20){
        $scope.getmore = true;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },1,$scope.context.userinfo.userid,start,20,'');
  }
  $scope.loadMore = function() {//下拉加载更多
    var start = 1;
    if($scope.todo){
      start = $scope.todo.length + 1;
    }
    homeService.todolist(function(data){
      if($scope.todo && $scope.todo.length>0){
        $scope.todo = $scope.todo.concat(data.DATAS.ITEM)
      }else{
        $scope.todo = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },1,$scope.context.userinfo.userid,start,20,'');
  };
  $scope.getTodo();
})
//草稿
.controller('draftCtrl',function($scope,homeService){
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getTodo = function(){
    var start = 1;
    homeService.todolist(function(data){
      if(data.DATAS.Total == 0){
        if(!$scope.initialized){
          $scope.initialized = true;
        }
        return
      }
      if(angular.isArray(data.DATAS.ITEM)){
        $scope.todo = data.DATAS.ITEM;
      }else{
        $scope.todo = [];
        $scope.todo[0] = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length>=20){
        $scope.getmore = true;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },5,$scope.context.userinfo.userid,start,20,'');
  }
  $scope.loadMore = function() {//下拉加载更多
    var start = 1;
    if($scope.todo){
      start = $scope.todo.length + 1;
    }
    homeService.todolist(function(data){
      if($scope.todo && $scope.todo.length>0){
        $scope.todo = $scope.todo.concat(data.DATAS.ITEM)
      }else{
        $scope.todo = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },5,$scope.context.userinfo.userid,start,20,'');
  };
  $scope.getTodo();
})
//关注
.controller('attentionCtrl',function($scope,homeService){
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getTodo = function(){
    var start = 1;
    homeService.todolist(function(data){
      if(data.DATAS.Total == 0){
        if(!$scope.initialized){
          $scope.initialized = true;
        }
        return
      }
      if(angular.isArray(data.DATAS.ITEM)){
        $scope.todo = data.DATAS.ITEM;
      }else{
        $scope.todo = [];
        $scope.todo[0] = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length>=20){
        $scope.getmore = true;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },4,$scope.context.userinfo.userid,start,20,'');
  }
  $scope.loadMore = function() {//下拉加载更多
    var start = 1;
    if($scope.todo){
      start = $scope.todo.length + 1;
    }
    homeService.todolist(function(data){
      if($scope.todo && $scope.todo.length>0){
        $scope.todo = $scope.todo.concat(data.DATAS.ITEM)
      }else{
        $scope.todo = data.DATAS.ITEM;
      }
      if(data.DATAS.ITEM.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },4,$scope.context.userinfo.userid,start,20,'');
  };
  $scope.getTodo();
})
.controller('dubanCtrl',function($scope,$ionicSideMenuDelegate){
  
  $scope.qq = function(){
    $ionicSideMenuDelegate.toggleLeft();
  }
})
/* .directive('customPasswdBox', function($window,$timeout) {
  return {
    restrict: "A",
    require: '?ngModel',
    link: function($scope, element, iAttrs, controller) {
      var x=angular.element('<i class="ion-eye-disabled" style="width:40px;height:35px;line-height:35px;"></i>');
      element.parent().after(x);
       $win = angular.element($window);
       $win.bind('resize',function(){
         resizex();
       })
      x.bind('click',function(e){
        event.preventDefault();
        element.attr('readonly',true)
        var timer = $timeout(
          function() {
            element.removeAttr('readonly')
          },
          100
        );
        if($scope.passtype == "password"){
          $scope.passtype = "text";
          x.addClass('ion-eye')
          x.removeClass('ion-eye-disabled')
          $scope.$apply();
        }else{
          $scope.passtype = "password"
          x.addClass('ion-eye-disabled')
          x.removeClass('ion-eye')
          $scope.$apply();
        }
      })
      var resizex=function(){
           $timeout(function(){
            var style = window.getComputedStyle ? window.getComputedStyle(x.parent()[0], "") : x.parent()[0].currentStyle;
            x[0].style['left']=element.parent()[0].offsetLeft+element.parent()[0].offsetWidth-32-25+"px";
            if(style.display == 'flex' || style.display == '-webkit-flex' ){
              x[0].style['position']="";
            }else{
              x[0].style['position']="absolute";
            }
            x[0].style['font-size']="24px";
            x[0].style['top']=element.parent()[0].offsetTop+(element.parent()[0].offsetHeight-x[0].offsetHeight)/2+"px";
            x[0].style['padding-left']='0';
            x[0].style['padding-right']='10px';
            x[0].style['z-index']=111;
          },50)
        }
        resizex();
    }
  };
}) */