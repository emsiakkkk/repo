angular.module('duban.mission', ['ionic', 'duban.mission.services', 'duban.mission.controllers'])
.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('oneMission', {
    url: '/oneMission/{id}',
      cache: false,
      views: {
        'side-view': {
        templateUrl: '../_custom/app-duban/mission/oneMission.html',
        controller: 'missCtrl'
      }
    }
  })
  .state('missPlan', {
    url: '/missPlan/{id}',
      views: {
        'side-view': {
        templateUrl: '../_custom/app-duban/mission/missPlan.html',
        controller: 'planDetailCtrl'
      }
    }
  })
  .state('task', {
    url: '/task/{id}/{code}/{sbj}/{sta}',
      cache: false,
      views: {
        'side-view': {
        templateUrl: '../_custom/app-duban/mission/task.html',
        controller: 'taskCtrl'
      }
    }
  })
  .state('duban.dmission', {
    url: '/dmission',
    cache: true,
    views: {
      'd-mission': {
        templateUrl: '../_custom/app-duban/mission/missionCenter.html',
        controller: 'dmissionCtrl'
      }
    }
  })
  .state('dmission', {
    url: '/dmission',
    cache: true,
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/mission/missionCenter.html',
        controller: 'dmissionCtrl'
      }
    }
  })
  .state('duban.dproject', {
    url: '/dproject',
    cache: true,
    views: {
      'd-project': {
        templateUrl: '../_custom/app-duban/mission/project.html',
        controller: 'dprojectCtrl'
      }
    }
  })
  .state('dproject', {

    url: '/dproject',
    cache: true,
    views: {
      'main-view': {
        templateUrl: '../_custom/app-duban/mission/project.html',
        controller: 'dprojectCtrl'
      }
    }
  });

});
angular.module('duban.mission.services', ['ngResource','x2js'])
.factory('missService', function(CONFIG,$imDominoSoap,x2js,$resource,$location) {
  return {
    getFlowinfo:function(app,unid,optName,aParam){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetFlowInfo',{
          'strUnid' : unid,  
          'strOptName' : optName,
          'aparam' : ''
        }
      ).then(function(data){
        return data.data;
      })
    },
    createDoc:function(dbpath,minfo,ywlx){
        var indiatts = '<INDIATTS xsi:type="urn:INDIDOCATTCHMENTARRAY">' +
          '<ARRAY xsi:type="urn:ArrayOfINDIDOCATTCHMENT" soapenc:arrayType="urn:INDIDOCATTCHMENT[]"/>' +
          '</INDIATTS>';
        var url = "/" + dbpath + "/wsForFlow?OpenWebService";
        return $imDominoSoap.invoke(
          url,
          'wsForDraft',
          {
            "strJson":ywlx,
            "indiatts": indiatts
          },
          {loading:true}
        ).then(function(res){
          return res.data;
        })
    },
    misssionList : function(app,callback,user,type,count,index,query){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetMyData',{
          'StrName' : user,  
          'StrType' : type,
          'count' : count,
          'index' : index,
          'sxQuery' : query
        }
        //{loading:true}
      ).success(function(data){
        angular.forEach(data.items[0].data,function(item){
          if(item.fldBljd != 0){
            item.isOpen = true
            //item.fldBljd >= 50 ? item.adv = true : item.adv = false;
			item.fldSfyq != "1" ? item.adv = true : item.adv = false;
          }else{
            item.isOpen = false
          }
        });
        angular.forEach(data.items[0].data,function(item){
          if(item.fldflow_jy !=0 && item.flownum_jy != 9999){
            item.lujing = "#/webflow/" + item.flowurl_jy + "/" + item.fldDocUnid;
          }else{
            item.lujing = "#/oneMission/" + item.fldDocUnid +"-" + item.subform;
          }
        })
        callback(data.items[0].data);
      }) 
    },
    reloadDoc:function(app,unid,flowinfo,type){
      var url = "/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnLoadDocFlow',{
          'strUnid' : unid,  
          'strFlowInfo' : flowinfo,
          'strOptName' : type,
          'aparam' : ''
        }
        //{loading:true}
      ).then(function(data){
        return data.data;
      })
    },
    jihe : function(app,callback,unid,user,$scope){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetZrwDetails',{
          'StrUnid' : unid,  
          'StrName' : user
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      })
    },    
    mission : function(app,callback,unid,user,$scope){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetZrwDetails',{
          'StrUnid' : unid,  
          'StrName' : user
        },
        {loading:true}
      ).success(function(data){
        if(data.wsForOptDocInfo && data.wsForOptDocInfo.fankui){
          angular.forEach(data.wsForOptDocInfo.fankui,function(item){
            item.fknr = item.strFksm.split("<br/>");
          })
        }
        if(data.wsForOptDocInfo){
          angular.forEach(data.wsForOptDocInfo.fenjie,function(item){
          if(item.fldflow_jy !=0 && item.flownum_jy != 9999){
            item.lujing = "#/webflow/" + item.flowurl_jy + "/" + item.strUnid;
          }else{
            item.lujing = "#/oneMission/" + item.strUnid +"-" + item.subform;
          }


        }) 
        }
        
        callback(data);
      }) 
    },
    //获取关联服务
    getgl : function(app,callback,unid,user,type){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetGL',{
          'StrMunid' : unid,  
          'StrName' : user,
          'StrType' : type
        }
         //{loading:true}
      ).success(function(data){
        callback(data);
      })
    },
    //发起催办
    fqcb : function(app,callback,unid,user,info){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnCb',{
          'StrMunid' : unid,  
          'StrName' : user,
          'StrData' : info
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      })    
    },
    //点评
    dp : function(app,callback,unid,user,info,type){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnDp',{
          'StrMunid' : unid,  
          'StrName' : user,
          'StrData' : info,
          'StrType': type
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      })    
    },
    //反馈
    fk : function(app,callback,unid,info,indi){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnFk',{
          'StrMunid' : unid,  
          'StrData' : info,
          'INDIATTS' : ""
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      })    
    },
    //接收
    js : function(app,unid,user){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnJs',{
          'StrUnid' : unid,  
          'StrName' : user,
          'Strjsfs' : "" 
        },
        {loading:true}
      ).then(function(data){
        return data;
      })    
    },
    //否认
    frbj : function(app,callback,unid,user,info){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnFrbj',{
          'StrUnid' : unid,  
          'StrName' : user,
          'StrData' : info
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      })    
    },
    //确认
    qrbj : function(app,callback,unid,user,info){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnQrbj',{
          'StrUnid' : unid,  
          'StrName' : user,
          'StrData' : info
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      }) 
    },
    //确认办结评分配置
    pfpz : function(app,callback){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetZlpjPz',{
    
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      }) 
    },
    project : function(app,callback,user,type,count,index,query){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetTaskData',{
          'StrName' : user,  
          'StrType' : type,
          'count' : count,
          'index' : index,
          'sxQuery' : query
        }
      ).success(function(data){
        if(data.WsForQuery.status=="true"){
          angular.forEach(data.items[0].data,function(item){
            if(item.fldBljd != 0){
              item.isOpen = true
              //item.fldBljd >= 50 ? item.adv = true : item.adv = false;
			  item.fldSfyq != "1" ? item.adv = true : item.adv = false;
            }else{
              item.isOpen = false
            }
          });
          angular.forEach(data.items[0].data,function(item){
            if(item.fldflow_jy !=0 && item.flownum_jy != 9999){
              item.lujing = "#/webflow/" + item.flowurl_jy + "/" + item.fldDocUnid;
            }else{
              item.lujing = "#/oneMission/" + item.fldDocUnid +"-" + item.subform;
            }
            angular.forEach(item.dataRes,function(i){
              if(i.fldflow_jy !=0){
                i.lujing = "#/webflow/" + i.flowurl_jy + "/" + i.fldDocUnid  +　"/" + i.fldType_jy;
              }else{
                i.lujing = "#/oneMission/" + i.fldDocUnid +"-" + i.subform;
              }
            })
          })
          callback(data.items[0].data);
        }else{
          callback([]);
        }
      }) 
    }, 
    collect : function(app,callback,type){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnTaskHuiZong',{
          'strType' : type
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      }) 
    },
    getPlanDetail : function(app,callback,unid){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetPlanDetails',{
          'strunid' : unid
        },
        {loading:true}
      ).success(function(data){
        callback(data);
      }) 
    },
    getjhleixing : function(app,callback){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetGzlxPz',{
        }//,
        //{loading:true}
      ).success(function(data){
        callback(data);
      })
    },
    biangeng : function(app,callback,ku,unid,name){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnReturnData',{
          'strdb' : ku,
          'strunid' : unid,
          'strname' : name
        }//,
        //{loading:true}
      ).success(function(data){
        callback(data);
      }) 
    },
    peizhi : function(app,callback){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetConfigInfo',{
        }//,
        //{loading:true}
      ).success(function(data){
        callback(data);
      })
    },
    navClassify : function(app,callback){
      var url ="/" + app + "/jywebservice.nsf/wsForJygl?OpenWebService";
      return $imDominoSoap.invoke(
        url,
        'fnGetMenuForJYGL',{
        }//,
        //{loading:true}
      ).success(function(data){
        callback(data);
      })    
    }

  }   
})
//功能service
.factory('$imCustomAction', function($ionicModal,$stateParams,$ionicHistory,$state,CONFIG,$imDominoSoap,x2js,$resource,$location,missService,$rootScope,$imTimedInfo) {
  return {

    qrbj:function(){
      // scope.openLevel();
      //直接在任务单确认办结时：$stateParams.id 兼容
      if($stateParams.id.split("-").length == 2){
        var tempParams = $stateParams.id;
        $stateParams.id = $stateParams.id.split('-')[0];
      }
      var scope = $rootScope.$new(true);
      var db_unifo = angular.fromJson(localStorage.getItem("uinfo"));
  var depinfo;
  if(db_unifo.custom.maindepinfo_jygl.host_jygl){
    depinfo = db_unifo.custom.maindepinfo_jygl;
  }else if(db_unifo.custom.otherdepinfo_jygl[0].host_jygl){
    depinfo = db_unifo.custom.otherdepinfo_jygl[0];
  }
  var host_jygl_port = depinfo.port_jygl;
  if(host_jygl_port!="" && host_jygl_port!="80"){
    host_jygl_port = ":"+host_jygl_port;
  }else{
    host_jygl_port = "";
  }
  var href_jy = 'http/'+depinfo.host_jygl+host_jygl_port+"/"+depinfo.appname_jygl;
     // var href_jy = 'http/'+db_unifo.custom.maindepinfo_jygl.host_jygl+"/"+db_unifo.custom.maindepinfo_jygl.appname_jygl;
      missService.pfpz(href_jy,function(data){
        scope.level = data;
        scope.level.value = "90";
        scope.level.pz = ""
    
      })
      //确定并评价任务
      $ionicModal.fromTemplateUrl('../_custom/app-duban/mission/level.html',{
        scope: scope,
        animation: 'slide-in-up'
      }).then(function(modal) {
        scope.levelModal = modal;
        modal.show();
      });

      // scope.openLevel = function(){
      //   scope.levelModal.show();
      // }
      scope.closeLevel = function(sure){
        if(!sure){
          scope.levelModal.hide();
        }else{
          var strdata = {};
          strdata.items =[];
          strdata.items[0] = {};
          strdata.items[0].zlpj = scope.level.value;
          strdata.items[0].bz = scope.level.py;
          var mydata = angular.toJson(strdata);
          if(scope.level.py==""||!scope.level.py){
            $imTimedInfo.show('评语不能为空').then(function(){
            })
            return;
          }
  var depinfo;
  if(db_unifo.custom.maindepinfo_jygl.host_jygl){
    depinfo = db_unifo.custom.maindepinfo_jygl;
  }else if(db_unifo.custom.otherdepinfo_jygl[0].host_jygl){
    depinfo = db_unifo.custom.otherdepinfo_jygl[0];
  }
  var host_jygl_port = depinfo.port_jygl;
  if(host_jygl_port!="" && host_jygl_port!="80"){
    host_jygl_port = ":"+host_jygl_port;
  }else{
    host_jygl_port = "";
  }
  var href_jy = 'http/'+depinfo.host_jygl+host_jygl_port+"/"+depinfo.appname_jygl;
          //var href_jy = 'http/'+db_unifo.custom.maindepinfo_jygl.host_jygl+"/"+db_unifo.custom.maindepinfo_jygl.appname_jygl;
          missService.qrbj(href_jy,function(data){
            if(data.WsForQuery.status){
              $imTimedInfo.show('确定成功')
              .then(function(){
                scope.levelModal.hide();
                $rootScope.myRefresh = true;
                $ionicHistory.currentView($ionicHistory.backView());
                $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true });
              });
            } 
          },$stateParams.id,db_unifo.fullname,mydata)
        }
      }
    },
    frbj:function(){
      var scope = $rootScope.$new(true);
      var db_unifo = angular.fromJson(localStorage.getItem("uinfo"));
      scope.ping ={};
      scope.ping.yu = ""
      //写评论模型
      $ionicModal.fromTemplateUrl('../_custom/app-duban/mission/comments.html', {
        scope: scope,
      }).then(function(modal) {
        modal.show();
        scope.comment = modal;
      });  
      scope.frAfterComment = function(mydata){
  var depinfo;
  if(db_unifo.custom.maindepinfo_jygl.host_jygl){
    depinfo = db_unifo.custom.maindepinfo_jygl;
  }else if(db_unifo.custom.otherdepinfo_jygl[0].host_jygl){
    depinfo = db_unifo.custom.otherdepinfo_jygl[0];
  }
  var host_jygl_port = depinfo.port_jygl;
  if(host_jygl_port!="" && host_jygl_port!="80"){
    host_jygl_port = ":"+host_jygl_port;
  }else{
    host_jygl_port = "";
  }
  var href_jy = 'http/'+depinfo.host_jygl+host_jygl_port+"/"+depinfo.appname_jygl;
        //var href_jy = 'http/'+db_unifo.custom.maindepinfo_jygl.host_jygl+"/"+db_unifo.custom.maindepinfo_jygl.appname_jygl;
        missService.frbj(href_jy,function(data){
          if(data.WsForQuery.status){
            $imTimedInfo.show('否定成功')
            .then(function(){
               $rootScope.myRefresh = true;
               $ionicHistory.currentView($ionicHistory.backView());
               $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true });
            });
          }   
        },$stateParams.id,db_unifo.fullname,mydata)
      }
      scope.cancelComment = function(){
        scope.comment.hide();
      }
      // scope.openM = function(){
      //   scope.comment.show();
      // };
      scope.closeM = function(){
        var strdata = {};
        strdata.items =[];
        strdata.items[0] = {}
        strdata.items[0].dpnr = scope.ping.yu
        var mydata = angular.toJson(strdata);
        if(scope.ping.yu==""||!scope.ping.yu){
          $imTimedInfo.show('评语不能为空')
          return;
        }
        scope.frAfterComment(mydata);
        scope.comment.hide();
      }
    }
  }
})
.directive('imInputWidth',function(){
  //督办pad版评论框
  return {
    restrict:'A',
    compile: function(element, attr){
      if (window.isPad) {
        var inputWidth=(document.body.clientWidth-130)*0.57
        element[0].style.width=inputWidth+"px"
        element[0].style.left=document.body.clientWidth-inputWidth+"px "
      }
    }
  }
})
angular.module('duban.mission.controllers', ['ngResource','x2js'])
.controller('dmissionCtrl', function(missService,$rootScope,$scope,DocService){

  //刷新列表判断类型
  $scope.whatSelect = 'zb';
  $scope.wSelect = function(name){
    $scope.whatSelect = name;
  }
  //主办
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getmission = function(){
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
    missService.misssionList(href_jy,function(data){
      $scope.zb = data
      if($scope.zb.length>=20){
        $scope.getmore = true;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },$scope.context.userinfo.fullname,'zb',20,start,'')
  }
  $scope.loadMore = function() {//下拉加载更多
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
    if($scope.zb){
      start = Math.floor($scope.zb.length/20) + 1;
    }
    missService.misssionList(href_jy,function(data){
      if($scope.zb && $scope.zb.length>0){
        $scope.zb = $scope.zb.concat(data);
      }else{
        $scope.zb = data;
      }
      if(data.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },$scope.context.userinfo.fullname,'zb',20,start,'');
  };
  $scope.getmission();

  //交办
  $scope.initialized2 = false;
  $scope.getmore2 = false;
  $scope.getmission2 = function(){
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
    missService.misssionList(href_jy,function(data){
      $scope.jb = data
      if($scope.jb.length>=20){
        $scope.getmore2 = true;
      }
      if(!$scope.initialized2){
        $scope.initialized2 = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },$scope.context.userinfo.fullname,'jb',20,start,'')
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
  //  var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    if($scope.jb){
      start = Math.floor($scope.jb.length/20) + 1;
    }
    missService.misssionList(href_jy,function(data){
      if($scope.jb && $scope.jb.length>0){
        $scope.jb = $scope.jb.concat(data)
      }else{
        $scope.jb = data;
      }
      if(data.length<20){
        $scope.getmore2 = false;
      }
      if(!$scope.initialized2){
        $scope.initialized2 = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },$scope.context.userinfo.fullname,'jb',20,start,'');
  };
  $scope.getmission2();

  //协办
  $scope.initialized3 = false;
  $scope.getmore3 = false;
  $scope.getmission3 = function(){
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
//    var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    missService.misssionList(href_jy,function(data){
      $scope.xb = data
      if($scope.xb.length>=20){
        $scope.getmore3 = true;
      }
      if(!$scope.initialized3){
        $scope.initialized3 = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },$scope.context.userinfo.fullname,'xb',20,start,'')
  }
  $scope.loadMore3 = function() {//下拉加载更多
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
    if($scope.xb){
      start = Math.floor($scope.xb.length/20) + 1;
    }
    missService.misssionList(href_jy,function(data){
      if($scope.xb && $scope.xb.length>0){
        $scope.xb = $scope.xb.concat(data)
      }else{
        $scope.xb = data;
      }
      if(data.length<20){
        $scope.getmore3 = false;
      }
      if(!$scope.initialized3){
        $scope.initialized3 = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },$scope.context.userinfo.fullname,'xb',20,start,'');
  };
  $scope.getmission3();

  //分管
  $scope.initialized4 = false;
  $scope.getmore4 = false;
  $scope.getmission4 = function(){
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
    missService.misssionList(href_jy,function(data){
      $scope.fg = data
      if($scope.fg.length>=20){
        $scope.getmore4 = true;
      }
      if(!$scope.initialized4){
        $scope.initialized4 = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },$scope.context.userinfo.fullname,'fg',20,start,'')
  }
  $scope.loadMore4 = function() {//下拉加载更多
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
    if($scope.fg){
      start = Math.floor($scope.fg.length/20) + 1;
    }
    missService.misssionList(href_jy,function(data){
      if($scope.fg && $scope.fg.length>0){
        $scope.fg = $scope.fg.concat(data)
      }else{
        $scope.fg = data;
      }
      if(data.length<20){
        $scope.getmore4 = false;
      }
      if(!$scope.initialized4){
        $scope.initialized4 = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },$scope.context.userinfo.fullname,'fg',20,start,'');
  };
  $scope.getmission4();
})
.controller('missCtrl', function($imHistory,missService,$scope,$location,$ionicModal,$ionicPopup,$ionicHistory,$stateParams,$state,$rootScope,$imTimedInfo,$ionicPopover,$imCustomAction,$filter){
  //获取任务信息
  $scope.isimpor = $stateParams.id.split('-')[1];
  $stateParams.id = $stateParams.id.split('-')[0];
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
  if($scope.isimpor == 'sfrmResolution' || $scope.isimpor == 'sfrmFocuses'){
    missService.jihe(href_jy,function(data){
      $scope.oneimp = data;
    },$stateParams.id,$scope.context.userinfo.fullname);
  }
  missService.mission(href_jy,function(data){
      angular.forEach(data.WsForAttach,function(item){
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
  		item.luj = depinfo.host_jygl+host_jygl_port + item.xzdz;
       // item.luj = $scope.context.userinfo.custom.maindepinfo_jygl.host_jygl +　item.xzdz;
        item.url = "http://"+item.luj;
        item.name = item.fjmc;
      }); 
      if (data.wsForOptDocInfo){
           angular.forEach(data.wsForOptDocInfo.fankui,function(item){
          if(item.strCgw !=""){
            item.fj = item.strCgw.split("*");
            item.newfj = []; 
           angular.forEach(item.fj,function(i){
               i = i.split("|");
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
  i[1] = depinfo.host_jygl+host_jygl_port + "/" + i[1] + "/" + i[2] + "/$file/" + i[3];  

           //   i[1] =  $scope.context.userinfo.custom.maindepinfo_jygl.host_jygl + "/" + i[1] + "/" + i[2] + "/$file/" + i[3];  
            item.newfj.push(i);

           }) 
          }
       })
         
    };
    angular.forEach(data.wsForOptDocInfo.fankui,function(item){
      if(item.newfj&&item.newfj.length>0){
        angular.forEach(item.newfj,function(data){
          data.url = "http://"+data[1];
          data.name = data[0]
        })
      }
    })
    $scope.oneMiss = data;
    if(data.WsForForm[0].kssj){
      $scope.oneMiss.WsForForm[0].kssj = $filter('date')(new Date(data.WsForForm[0].kssj),'yyyy-MM-dd');
    }
    if(data.WsForForm[0].jssj){
      $scope.oneMiss.WsForForm[0].jssj = $filter('date')(new Date(data.WsForForm[0].jssj),'yyyy-MM-dd');
    }
    if(data.WsForForm[0].zbr){
      $scope.oneMiss.WsForForm[0].zbr = data.WsForForm[0].zbr.split(",");
    }
    if(data.WsForForm){
      $scope.fk.jindu = data.WsForForm[0].bljd;
    }
    


  },$stateParams.id,$scope.context.userinfo.fullname).then(function(){
    $scope.zdxf($scope.oneMiss);
  });
  //获取关联信息
  missService.getgl(href_jy,function(data){
    $scope.gl = data.item;
  },$stateParams.id,$scope.context.userinfo.fullname,'isP');
  
  //执行相关操作
  $scope.opreation = function(name,$event){
    switch(name){
      case "发起催办":
        $scope.fqcb($event);
        break
      case "点评":
        $scope.dp($event);
        break
      case "反馈":
        $scope.fk();
        break
      case "接收":
        $scope.js();
        break
      case "否认办结":
        $scope.fr($event);
        break
      case "确认办结":
        // $scope.qr();
        $imCustomAction.qrbj();
        break
    }
  }
  $scope.opr
  //发起催办
  $scope.ping ={};
  $scope.ping.yu = ""
  $scope.fqcb = function(){
    $scope.opr = 'fqcb'
    $scope.openM();
  }
  $scope.fqcbAfterComment = function(mydata){
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
    missService.fqcb(href_jy,function(data){
      if(data.WsForQuery.status){
        $imTimedInfo.show('催办成功')
        .then(function(){
          $rootScope.myRefresh = true;
          $ionicHistory.currentView($ionicHistory.backView());
          $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true }); 
        });
      }   
    },$stateParams.id,$scope.context.userinfo.fullname,mydata)
  }

  //点评
  $scope.dp = function(){
    $scope.opr = 'dp'
    $scope.openM()
  }
  $scope.dpAfterComment = function(mydata){
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
    missService.dp(href_jy,function(data){
      if(data.WsForQuery.status){
        $imTimedInfo.show('点评成功')
        .then(function(){
           $rootScope.myRefresh = true;
           $ionicHistory.currentView($ionicHistory.backView());
           $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true });
        });
      }   
    },$stateParams.id,$scope.context.userinfo.fullname,mydata,1)
  }

  //反馈
  $scope.fk = function(){
    $scope.openFankui();
  }
  
  //接收
  $scope.js = function(){
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
    missService.js(href_jy,$stateParams.id,$scope.context.userinfo.fullname).then(function(data){
      if(data.status){
        $imTimedInfo.show('接收成功')
        .then(function(){
           $rootScope.myRefresh = true;
           $ionicHistory.currentView($ionicHistory.backView());
           $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true });
        });
      }    
    })  
  }

  //否认办结
  $scope.fr = function($event){
    $scope.opr = 'fr'
    $scope.openM()
  }
  $scope.frAfterComment = function(mydata){
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
    missService.frbj(href_jy,function(data){
      if(data.WsForQuery.status){
        $imTimedInfo.show('否定成功')
        .then(function(){
           $rootScope.myRefresh = true;
           $ionicHistory.currentView($ionicHistory.backView());
           $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true });
        });
      }   
    },$stateParams.id,$scope.context.userinfo.fullname,mydata)
  }

  //确认办结
  // $scope.qr = function(){
  //   $scope.openLevel();
  //   missService.pfpz($scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl,function(data){
  //     $scope.level = data;
  //     $scope.level.value = "90";
  //     $scope.level.pz = ""
  
  //   })
  // }
  //确定并评价任务
  // $ionicModal.fromTemplateUrl('../_custom/app-duban/mission/level.html',{
  //   scope: $scope,
  //   animation: 'slide-in-up'
  // }).then(function(modal) {
  //   $scope.levelModal = modal;
  // });

  // $scope.openLevel = function(){
  //   $scope.levelModal.show();
  // }
  // $scope.closeLevel = function(sure){
  //   if(!sure){
  //     $scope.levelModal.hide();
  //   }else{
  //     var strdata = {};
  //     strdata.items =[];
  //     strdata.items[0] = {};
  //     strdata.items[0].zlpj = $scope.level.value;
  //     strdata.items[0].bz = $scope.level.py;
  //     var mydata = angular.toJson(strdata);
  //     missService.qrbj($scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl,function(data){
  //       if(data.WsForQuery.status){
  //         $imTimedInfo.show('确定成功')
  //         .then(function(){
  //           $scope.levelModal.hide();
  //           $rootScope.myRefresh = true;
  //           $ionicHistory.currentView($ionicHistory.backView());
  //           $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true });
  //         });
  //       } 
  //     },$stateParams.id,$scope.context.userinfo.fullname,mydata)
  //   }
  // }
  
  $scope.fk.fldsfbj = false;

 
  $scope.fk.isbj = "";
  $scope.fkcontent = {};
  $scope.fkcontent.jz ="";
  $scope.fkcontent.jh ="";
  $scope.jzsm = true;
  //反馈模型
  $scope.isbanjie = function(){
    if($scope.fk.fldsfbj){
      $scope.fk.isbj = 1
    }else{
      $scope.fk.isbj = ""
    }
  }
  $ionicModal.fromTemplateUrl('../_custom/app-duban/mission/fankui.html',{
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.fankuiModal = modal;
  });
  $scope.fnValidate = function(){
     if ($scope.fkcontent.jz == ""){
      $scope.jzsm = true;
     }else{
      $scope.jzsm = false;
    }
  }
  $scope.openFankui = function(){
    $scope.fankuiModal.show();
  }
  $scope.closeFankui = function(sure){
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
    if(!sure){
      $scope.fankuiModal.hide();
    }else{
      var strdata = {};
      strdata.items =[];
      strdata.items[0] = {}
      strdata.items[0].fldNiGaoRen = $scope.context.userinfo.fullname;
      strdata.items[0].fldBljd = $scope.fk.jindu;
      strdata.items[0].fldsfbj = $scope.fk.isbj 
      strdata.items[0].fldzxjz = $scope.fkcontent.jz;
      strdata.items[0].fldXbjh = $scope.fkcontent.jh;
      var mydata = angular.toJson(strdata);
      missService.fk(href_jy,function(data){
        //走流程
       function reloadDoc(strFlowInfo,rwinfo){
       var depinfo;
      if($scope.context.userinfo.custom.maindepinfo_jygl.host_jygl){
        depinfo = $scope.context.userinfo.custom.maindepinfo_jygl;
      }else if($scope.context.userinfo.custom.otherdepinfo_jygl[0].host_jygl){
        depinfo = $scope.context.userinfo.custom.otherdepinfo_jygl[0];
      }
          var dbpath = depinfo.appname_jygl + "/jyfkzx.nsf";
          var ywlx = strFlowInfo.items[0];
          var myJsDate=$filter('date')(new Date(),'yyyy-MM-dd');
          var fldsubject = "反馈《"+data.rwinfo.context.fldSubject[0]+"》"+myJsDate;
          angular.extend(ywlx,{
                    "tryTypeTrans":"false",
                    "typeunid":ywlx.unid,
                    "data":{
                      fldBljd:[strdata.items[0].fldBljd.toString()],
                      fldBljdValue:[strdata.items[0].fldBljd.toString()],
                      fldSfbj:[strdata.items[0].fldsfbj.toString()],
                      fldSfbjValue:[strdata.items[0].fldsfbj.toString()],
                      fldzxjz:[strdata.items[0].fldzxjz],
                      fldzxjzText:[strdata.items[0].fldzxjz],
                      fldXbjh:[strdata.items[0].fldXbjh],
                      fldXbjhText:[strdata.items[0].fldXbjh],
                      fldZxjd:data.rwinfo.context.fldBljd,
                      fldAlldpr:data.rwinfo.context.fldAlldpr,
                      fldSrcUnid:data.rwinfo.context.fldSrcDocUNID,
                      fldSrcApp:data.rwinfo.context.fldSrcApp,
                      fldSrcHost:data.rwinfo.context.fldSrcDocServer,
                      fldmunid:[data.rwinfo.unid],
                      fldGrwGjz:data.rwinfo.context.fldGrwGjz,
                      fldZrwGjz:data.rwinfo.context.fldZrwGjz,
                      fldSubject:[fldsubject],
                      fldperdbpath:data.rwinfo.context.dbPath,
                    },
                    "isTmpDoc":true
                  });
          var minfo = {
            url:"/"+dbpath+"/frmcreatedoc?openform"
          }; 
          missService.createDoc('http/'+depinfo.host_jygl+'/'+dbpath,minfo,JSON.stringify(ywlx)).then(function(data){
            if(data.type=='success'){
              if(minfo.url.indexOf('http')>=0){
                url=minfo.url.match(/http.*.nsf/)[0]
              }else{
                url=(depinfo.host_jygl+minfo.url).match(/.*.nsf/)[0]
              }
              var domain=url.match(/[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9|:]{0,62})+\.?/)[0];
              var dbpath=url.match(/\.[a-zA-Z0-9|:]{0,62}\/(.*.nsf)/)[1];
              if($location.search().dbpath){
                $imHistory.nextViewOptions({replaceHistory:true}) 
              }
              $scope.fankuiModal.hide(); 
              $location.path("/webflow/"+domain+"/"+dbpath+"/"+data.unid);                                          
            }else{
              $imTimedInfo.show(data.msg)
            }
          });
        }
        //不走流程
        function refreshDoc(fkresult){
          if(fkresult.WsForQuery.status){
             $imTimedInfo.show('反馈成功')
             .then(function(){
                $scope.fankuiModal.hide();
                $rootScope.myRefresh = true;
                $ionicHistory.currentView($ionicHistory.backView());
                $state.go($state.current, $stateParams, { location:false, reload: true, inherit: false, notify: true });
              });
            }
        }
        $scope.flowinfo = {};
        if(data.flowinfo&&data.flowinfo[0].items){
          if(data.flowinfo[0].items.length>1){
            $scope.flowinfo.items = data.flowinfo[0].items;
            $ionicModal.fromTemplateUrl('../_custom/app-duban/mission/selectfFlow.html', {
              scope: $scope,
            }).then(function(modal) {
              $scope.selectType = modal;
              modal.show();
            });
            $scope.closeFlow = function(){
              $scope.flowtype = ""
              $scope.selectType.hide();
            }
            $scope.select = {};
            $scope.$watch('select.type', function() {
              angular.forEach($scope.flowinfo.items,function(item){
                if(item.type==$scope.select.type){
                  $scope.flowtype = item.flowtype;
                  $scope.simpleinfo = item.info
                  $scope.submitFlow = function(){
                    var flowinfo = {};
                    flowinfo.items = [];
                    flowinfo.items.push(item)
                    $scope.selectType.hide()
                    reloadDoc(flowinfo,data.rwinfo);
                  }
                }
              })
            });
          }
          else if(data.flowinfo[0].items.length==1){
            $ionicPopup.confirm({
              template:"反馈已"+data.flowinfo[0].items[0].type+",是否立即发起"+data.flowinfo[0].items[0].flowtype,
            }).then(function(val){
              if(val){
                reloadDoc(data.flowinfo[0],data.rwinfo);
              }
            })
          }
          else{
            refreshDoc(data);
          }
        }
        else{
          refreshDoc(data);         
        }
      },$stateParams.id,mydata,"")
    }
  }
  
  //写评论模型
  $ionicModal.fromTemplateUrl('../_custom/app-duban/mission/comment.html', {
    scope: $scope,
  }).then(function(modal) {
    $scope.comment = modal;
  });  
  $scope.openM = function(){
    $scope.comment.show();
  };
  $scope.closeM = function(name){
    var strdata = {};
    strdata.items =[];
    strdata.items[0] = {}
    switch(name){
      case "fqcb" :
        strdata.items[0].cbnr = $scope.ping.yu
        if(strdata.items[0].cbnr == ""){
         $imTimedInfo.show('不可为空')
          return    
        }
        var mydata = angular.toJson(strdata);
        $scope.fqcbAfterComment(mydata);
        break
      case "dp" :
        strdata.items[0].dpnr = $scope.ping.yu
        if (strdata.items[0].dpnr == "") {
          $imTimedInfo.show('不可为空')
          return  
        };
        var mydata = angular.toJson(strdata);
        $scope.dpAfterComment(mydata);
        break
      case "fr" :
        strdata.items[0].dpnr = $scope.ping.yu
        var mydata = angular.toJson(strdata);
        $scope.frAfterComment(mydata);
        break    
    }
    $scope.comment.hide();
  }
  $scope.openPOP = function(){
    $ionicPopup.confirm({
      title: '确认催办？',
    }).then(function(){
    }); 
  }
  $scope.missionXf = function(flowinfo){
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
    missService.reloadDoc(href_jy,$stateParams.id,angular.toJson(flowinfo),'未下发').then(function(data){
      if(data.WsForQuery.status == "true"){
        var url = "/webflow/"+depinfo.host_jygl+"/"+depinfo.appname_jygl+"/"+data.dbpath+"/"+$stateParams.id;
        $imHistory.nextViewOptions({replaceHistory:true}) 
        $location.path(url);
      }
    });
  };

  $scope.zdxf = function(data){
    var fldrwzt = data.WsForForm[0].rwzt;
    var fldSfWxf = data.WsForForm[0].sfwxf;
    var strNiGaoRen = data.WsForForm[0].ngr;
    var strUserName = $scope.context.userinfo.fullname;
    var strZtName = data.WsForForm[0].ztmc;
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
    if(fldrwzt=="0" && fldSfWxf=="0" && strNiGaoRen==strUserName && strZtName === ""){
      missService.getFlowinfo(href_jy,$stateParams.id,'未下发','').then(function(data){
        if(data.WsForQuery.status == "true"){
			if(data.flowinfo[0]==0){
				//直接下发，移动端暂不支持
			}else{
			  $ionicPopup.confirm({
				title:'是否确认下发？'
			  }).then(function(val){
				if(val){
				  $scope.flowinfo = {};
				  if(data.flowinfo[0].items.length==1){
					//单流程
					$scope.missionXf(data.flowinfo[0]);
				  }else if(data.flowinfo[0].items.length>1){
					//多流程
					$scope.flowinfo.items = data.flowinfo[0].items;
					$ionicModal.fromTemplateUrl('../_custom/app-duban/mission/selectfFlow.html', {
					  scope: $scope,
					}).then(function(modal) {
					  $scope.selectType = modal;
					  modal.show();
					});
					$scope.closeFlow = function(){
					  $scope.flowtype = ""
					  $scope.selectType.hide();
					}
					$scope.select = {};
					$scope.$watch('select.type', function() {
					  angular.forEach($scope.flowinfo.items,function(item){
						if(item.type==$scope.select.type){
						  $scope.flowtype = item.flowtype;
						  $scope.simpleinfo = item.info
						  $scope.submitFlow = function(){
							var flowinfo = {};
							flowinfo.items = [];
							flowinfo.items.push(item)
							$scope.selectType.hide()
							$scope.missionXf(flowinfo);
						  }
						}
					 }) 
					});
				  }
				}
			 })
			}
        }
      });
    }
  };
})
.controller('planDetailCtrl',function($scope,missService,$stateParams){
  $scope.unid = $stateParams.id;
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
  missService.getPlanDetail(href_jy,function(data){
    
    if(data.items.strIdx!=""){
      data.items.fj = data.items.strIdx.split("*");
      data.items.newfj = []; 
      angular.forEach(data.items.fj,function(i){
        i = i.split("|");
        i[1] =  depinfo.host_jygl + "/" + i[1] + "/" + i[2] + "/$file/" + i[3]; 
        data.items.newfj.push(i);
      });
    if(data.items.newfj&&data.items.newfj.length>0){
      angular.forEach(data.items.newfj,function(data){
          data.url = "http://"+data[1];
          data.name = data[0] 
        })
      }
    }

    $scope.missplan = data.items;
  },$scope.unid)
})
.controller('dprojectCtrl',function($scope,searchService,missService,$ionicActionSheet,$ionicPopover){
  $scope.currtitle = "决议督办";
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
  missService.navClassify(href_jy,function(data){
    $scope.fenlei = data.items;
    $scope.currtitle = data.items[0].title;
    $scope.currfenlei = data.items[0].openurl;
    $scope.getmission(data.items[0].openurl);
  })
  $scope.sxQuery = {
    'items': [{
      strRwzt : "",
      strGzlx : ""
    }]
  }
  
  // searchService.ywlx($scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl,function(data){
  //   $scope.types = data.items;
  //   // angular.forEach($scope.types,function(item,index){
  //   //   $scope.typesMap[index] = {'text':item.ywlx};
  //   // })
  //   $scope.getmission(3);
  // })
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getmission = function(type){
    var start = 1;
    var leixingjson =  angular.toJson($scope.sxQuery);
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
 //   var href_jy = 'http/'+$scope.context.userinfo.custom.maindepinfo_jygl.host_jygl+"/"+$scope.context.userinfo.custom.maindepinfo_jygl.appname_jygl;
    missService.project(href_jy,function(data){
      $scope.projectList = data
      if($scope.projectList.length>=20){
        $scope.getmore = true;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },$scope.context.userinfo.fullname,type,20,start,leixingjson)
  }
  $scope.loadMore = function(type) {//下拉加载更多
    var start = 1;
    var leixingjson =  angular.toJson($scope.sxQuery);
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
    if($scope.projectList){
      start = Math.floor($scope.projectList.length/20) + 1;
    }

    missService.project(href_jy,function(data){
      if($scope.projectList && $scope.projectList.length>0){
        $scope.projectList = $scope.projectList.concat(data)
      }else{
        $scope.projectList = data;
      }
      if(data.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },$scope.context.userinfo.fullname,type,20,start,leixingjson);
  };

  $scope.showType = function(type,name){
    $scope.currtitle = name;
    $scope.currfenlei = type;
    $scope.getmission(type);
    $scope.closePopover();
  //   $ionicActionSheet.show({
  //     buttons: $scope.typesMap
  //     buttonClicked: function(index){
  //       //$scope.types[index].ywlxbzf
  //       $scope.tt = $scope.types[index].ywlxbzf
  //       $scope.getmission($scope.tt)
  //       return true;
  //     }
  //   })
  }
  $ionicPopover.fromTemplateUrl('../_custom/app-duban/mission/projectClassify.html', {
    scope: $scope
  }).then(function(popover){
    $scope.popover = popover;
  });
  $scope.openPopover = function($event){
    $scope.popover.show($event);
  };
  $scope.closePopover = function(){
    $scope.popover.hide();
  };
})
.controller('planCtrl',function($scope,searchService,missService,$ionicPopover){
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
  missService.getjhleixing(href_jy,function(data){
    $scope.types = data.items
  })
  $scope.sxQuery = {
    'items': [{
      strRwzt : "",
      strGzlx : ""
    }]
  }
  $scope.showType = function(id){
    $scope.sxQuery.items[0].strGzlx = id
    $scope.getmission(4);
    $scope.closePopover();
  }
  $ionicPopover.fromTemplateUrl('../_custom/app-duban/mission/planClassify.html', {
    scope: $scope
  }).then(function(popover){
    $scope.popover = popover;
  });
  $scope.openPopover = function($event){
    $scope.popover.show($event);
  };
  $scope.closePopover = function(){
    $scope.popover.hide();
  };
  $scope.initialized = false;
  $scope.getmore = false;
  $scope.getmission = function(type){
    var start = 1;
    var leixingjson =  angular.toJson($scope.sxQuery);
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
    missService.project(href_jy,function(data){
      $scope.projectList = data
      if($scope.projectList.length>=20){
        $scope.getmore = true;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.refreshComplete');
    },$scope.context.userinfo.fullname,type,20,start,leixingjson)
  }
  $scope.loadMore = function(type) {//下拉加载更多
    var start = 1;
    var leixingjson =  angular.toJson($scope.sxQuery);
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
    if($scope.projectList){
      start = Math.floor($scope.projectList.length/20) + 1;
    }
    missService.project(href_jy,function(data){
      if($scope.projectList && $scope.projectList.length>0){
        $scope.projectList = $scope.projectList.concat(data)
      }else{
        $scope.projectList = data;
      }
      if(data.length<20){
        $scope.getmore = false;
      }
      if(!$scope.initialized){
        $scope.initialized = true;
      }
      $scope.$broadcast('scroll.infiniteScrollComplete');
    },$scope.context.userinfo.fullname,type,20,start,leixingjson);
  };
  $scope.getmission(4);
})
.controller('taskCtrl',function($stateParams,$scope,missService){
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
  missService.mission(href_jy,function(data){
    $scope.task = data;
    $scope.task.code = $stateParams.code;
    $scope.task.sbj = $stateParams.sbj;
    $scope.task.sta = $stateParams.sta;
  },$stateParams.id,$scope.context.userinfo.fullname);
  
})