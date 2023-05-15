angular.module('duban.search', ['ionic', 'duban.search.services', 'duban.search.controllers'])
.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('duban.dsearch', {
    url: '/dsearch',
    cache: true,
    views: {
      'd-search': {
        templateUrl: '../_custom/app-duban/search/search.html',
        controller: 'dsearchCtrl'
      }
    }
  })
  .state('dsearch', {
    url: '/dsearch',
    cache: true,
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/search/search.html',
        controller: 'dsearchCtrl'
      }
    }
  })
});
angular.module('duban.search.services', ['ngResource','x2js'])
.factory('dbsearchService', function(CONFIG,$imDominoSoap,x2js,$resource,$http,$timeout) {
  return {
    search : function(app,callback,name,count,index,strdata){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnDoSearch',{
          'STRNAME' : name,  
          'count' : count,
          'index' : index,
          'strData' : strdata 
        },
        {loading:true}
      ).success(function(data){
        angular.forEach(data.items,function(item){
          if(item.fldBljd != 0){
            item.isOpen = true
            item.fldBljd >= 50 ? item.adv = true : item.adv = false;
          }else{
            item.isOpen = false
          }
        });
        angular.forEach(data.items,function(item){
          if(item.fldflow_jy == 1  && item.flownum_jy != 9999){
            item.lujing = "#/webflow/" + item.flowurl_jy + "/" + item.fldDocUnid ;
          }else{
            item.lujing = "#/oneMission/" + item.fldDocUnid +"-" + item.subform;
          }
        })
        callback(data.items);
      })
    },
    ywlx : function(app,callback){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetYwlxPz',{
        }//,
        //{loading:true}
      ).success(function(data){
        callback(data);
      })  
    }
  }   
});
angular.module('duban.search.controllers', ['ngResource','x2js'])
.controller('dsearchCtrl', function($scope,$timeout,$ionicPopover,dbsearchService,$ionicModal,$filter,$ionicPopup) {
  
  $scope.dupaixu = false;
  $scope.addmore = false;  //加载圈圈显示
  $scope.query = {};
  $scope.query.sort = "";
  $scope.query.shaixuan = {};
  $scope.query.yw = ""
  $scope.query.ywName = "业务类型"
  $scope.query.key = "";
  $scope.showList = true;
  $scope.showNodata = false;
  $scope.getmore = false;
  $scope.query.shaixuan.zbr = '';
  $scope.query.shaixuan.zbbm = '';
  $scope.query.shaixuan.fgld = '';
  $scope.query.shaixuan.kssj = ['',''];
  $scope.query.shaixuan.jssj = ['',''];
  
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
  dbsearchService.ywlx(href_jy,function(data){
    $scope.types = data.items;
  })

  //回车进行搜索
  $scope.enterDosearch = function(e){  
    if(e.keyCode==13){
      $scope.query.yw = '';
      $scope.clearFilter();
      $scope.dosearch();
      e.preventDefault();
      $scope.searchRed = '';
    }
  };
  //搜索
  $scope.dosearch = function(){
    //请求数据
    var kssj = [];
    var jssj = [];
    kssj[0] = $filter('date')($scope.query.shaixuan.kssj[0],'yyyy-MM-dd');
    kssj[1] = $filter('date')($scope.query.shaixuan.kssj[1],'yyyy-MM-dd');
    jssj[0] = $filter('date')($scope.query.shaixuan.jssj[0],'yyyy-MM-dd');
    jssj[1] = $filter('date')($scope.query.shaixuan.jssj[1],'yyyy-MM-dd');
    var zbr = $scope.query.shaixuan.zbr == ""?[""]:$scope.query.shaixuan.zbr;
    var zbbm = $scope.query.shaixuan.zbbm == ""?[""]:$scope.query.shaixuan.zbbm;
    var fgld = $scope.query.shaixuan.fgld == ""?[""]:$scope.query.shaixuan.fgld;
    var strdata = {
      items : {
        keyword : $scope.query.key,
        pxfs : $scope.query.sort,
        ywlx : $scope.query.yw,
        kssj : kssj,
        jssj : jssj,
        zbr : zbr,
        zbbm : zbbm,
        fgld : fgld
      }
    }
    var mydata = angular.toJson(strdata);
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
    dbsearchService.search(href_jy,function(data){
      
      $scope.docs = data;
      if($scope.docs.length>=20){
        $scope.getmore = true;
      }
      $scope.showRecord = false;
      if($scope.docs == 0){
        $scope.dupaixu = false;
        $scope.showList = false;
        $scope.showNodata = true;
      }else{
        $scope.showList = true
        if($scope.docs.length > 0){
          $scope.dupaixu = true;
          $scope.addmore = true;
          $scope.showNodata = false;
        }  
      }
      $scope.query.type = "";
      $scope.qkey = $scope.query.key;
    },$scope.context.userinfo.fullname,20,1,mydata)
  };

  $scope.loadMore = function() {//下拉加载更多
    var kssj = [];
    var jssj = [];
    kssj[0] = $filter('date')($scope.query.shaixuan.kssj[0],'yyyy-MM-dd');
    kssj[1] = $filter('date')($scope.query.shaixuan.kssj[1],'yyyy-MM-dd');
    jssj[0] = $filter('date')($scope.query.shaixuan.jssj[0],'yyyy-MM-dd');
    jssj[1] = $filter('date')($scope.query.shaixuan.jssj[1],'yyyy-MM-dd');
    var zbr = $scope.query.shaixuan.zbr == ""?[""]:$scope.query.shaixuan.zbr;
    var zbbm = $scope.query.shaixuan.zbbm == ""?[""]:$scope.query.shaixuan.zbbm;
    var fgld = $scope.query.shaixuan.fgld == ""?[""]:$scope.query.shaixuan.fgld;
    var strdata = {
      items : {
        keyword : $scope.query.key,
        pxfs : $scope.query.sort,
        ywlx : $scope.query.yw,
        kssj : kssj,
        jssj : jssj,
        zbr : zbr,
        zbbm : zbbm,
        fgld : fgld
      }
    }
    var mydata = angular.toJson(strdata);
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
    if($scope.docs){
      start = Math.floor($scope.docs.length/20) + 1;
    }
    dbsearchService.search(href_jy,function(data){
      if($scope.docs && $scope.docs.length>0){
        $scope.docs = $scope.docs.concat(data)
      }else{
        $scope.docs = data;
      }
      if(data.length<20){
        $scope.getmore = false;
      }
      // if(!$scope.initialized){
      //   $scope.initialized = true;
      // }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },'CN=admin/O=smartdot',20,start,mydata);
  };
  //时间排序
  $scope.timeSort = function(){
    if($scope.dupaixu == false){
      return 
    }
    switch($scope.query.sort){
      case 'jiangxu' :
        $scope.query.sort = 'shengxu';
        break
      case 'shengxu' :
        $scope.query.sort = 'jiangxu';
        break
      default :
        $scope.query.sort = 'jiangxu';    
    }
    $scope.dosearch();
  }
  //业务类型
  $scope.businessType = function(name,nn){
    $scope.query.yw = name
    $scope.query.ywName = nn
    $scope.dosearch();  
    $scope.closePopover(); 
  }
  //筛选
  $scope.setFilter = function(){
    $scope.query.key = "";
    $scope.query.yw = '';
    $scope.query.shaixuan.kssj =  $filter('date')($scope.query.shaixuan.kssj,'yyyy-MM-dd');
    $scope.query.shaixuan.jssj =  $filter('date')($scope.query.shaixuan.jssj,'yyyy-MM-dd');
    if($scope.query.shaixuan.kssj[0]>$scope.query.shaixuan.jssj[0]||$scope.query.shaixuan.kssj[1]>$scope.query.shaixuan.jssj[1]){
      $ionicPopup.alert({
          template:"开始时间应小于结束时间"
    });
    return false;
    }
    if(($scope.query.shaixuan.kssj[0]!=""&&$scope.query.shaixuan.kssj[1]=="")||($scope.query.shaixuan.kssj[0]==""&&$scope.query.shaixuan.kssj[1]!="")||($scope.query.shaixuan.jssj[0]!=""&&$scope.query.shaixuan.jssj[1]=="")||($scope.query.shaixuan.jssj[0]==""&&$scope.query.shaixuan.jssj[1]!=""))
    {
      $ionicPopup.alert({
          template:"开始时间和结束时间不唯一"
    });
    return false;
    }
    // if($scope.query.shaixuan.zbr && $scope.query.shaixuan.zbr!=""){
    //   $scope.query.shaixuan.zbr = $scope.query.shaixuan.zbr[0]; 
    // }
    // if($scope.query.shaixuan.zbbm && $scope.query.shaixuan.zbbm!=""){
    //   $scope.query.shaixuan.zbbm = $scope.query.shaixuan.zbbm[0]; 
    // }
    // if($scope.query.shaixuan.fgld && $scope.query.shaixuan.fgld!=""){
    //   $scope.query.shaixuan.fgld = $scope.query.shaixuan.fgld[0]; 
    // }
    
    $scope.dosearch();
    $scope.closeModal();
    $scope.searchRed = 'searchRed'
  }
  $scope.clearFilter = function(){
    $scope.query.shaixuan.kssj = ['','']
    $scope.query.shaixuan.jssj = ['','']
    $scope.query.shaixuan.zbbm = ''    
    $scope.query.shaixuan.zbr = ''
    $scope.query.shaixuan.fgld = ''    
  }


  // //显示记录
  // $scope.scanRecord = function(){
  //   $scope.showList = false;
  //   $scope.showNodata = false;
  //   $scope.showRecord = true;
  // };
  // //记录搜索
  // $scope.recordSearch = function(re){
    // console.log(re);
  //   $scope.keyword = re;
  //   $scope.dosearch();
  // }
  
    //业务类型分类弹层
  $ionicPopover.fromTemplateUrl('../_custom/app-duban/search/poper.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });
  $scope.openPopover = function($event) {
    var len=$scope.types.length
    len&&(len>6?$scope.modifypop = true:$scope.modifypop = false,$scope.popover.show($event))
  };
  $scope.closePopover = function() {
    $scope.popover.hide();
  };
  //筛选弹层
  $ionicModal.fromTemplateUrl('../_custom/app-duban/search/filter.html', {
    scope: $scope,
    animation: 'slide-in-up',
  }).then(function(modal) {
    $scope.searchFilter = modal;
  });
  $scope.openModal = function() {
    $scope.searchFilter.show();
  };
  $scope.closeModal = function() {
    $scope.searchFilter.hide();
  }
})