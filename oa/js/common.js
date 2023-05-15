angular.module('indiplatform.common', [
  'ionic',
  'ngIOS9UIWebViewPatch',
  'pascalprecht.translate',
  'jcs-autoValidate',
  'angularMoment',
  'monospaced.qrcode',
  'indiplatform.common.service', 'indiplatform.common.filter', 'indiplatform.common.directive'])
.run(function ($ionicPlatform,wwwinfoService,UpdateService,$ionicPopup,$filter,$imUserInfo,$timeout,$rootScope,$imLightApp) {
  if(indiplatform.isLightApp()){
    document.body.classList.add('platform-lapp');
  }
  function hideSplashScreen(delay){
    $ionicPlatform.ready(function(){
      $timeout(function() {
        navigator.splashscreen && navigator.splashscreen.hide();
      },delay||0)
    })
  }
  $ionicPlatform.ready(function(){    
    //判断是否有cordova InAppBrowser插件
    var inAppBrowserFlag = (window.cordova && window.cordova.InAppBrowser) || (window.open.toString().indexOf("InAppBrowser") > -1);
    if(!window.cordova || !inAppBrowserFlag) {
      window.open=function(url,str){
        if(str!=='_system') return;
        $imLightApp.openInBrowser(url)
      }
    }
  })      
  if(!indiplatform.isLightApp()){
    var offHandle = $rootScope.$on("$stateChangeSuccess",function() {
      // 首页加载后再隐藏启动页
      offHandle();
      hideSplashScreen();
    })
  }else{
    // 轻应用直接隐藏splash
    hideSplashScreen();
    // 轻应用在maxWindow时会通知进入webview，此处作为后备
    $timeout(function() {
      $ionicPlatform.ready(function() {
        window.webview && webview.Enter();
      })
    },5000)
  }
    $ionicPlatform.ready(function(){
      if(ionic.Platform.isIOS()){
        // iOS 下禁止键盘推动输入框，与webview默认行为冲突
        ionic.keyboard.disable();
      }
      if(window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
        cordova.plugins.Keyboard.disableScroll(false);
      }
      // 必须用此方式绑定事件，addEventListener不管用
      window.ononline = window.onoffline = updateOnlineState;
      function updateOnlineState () {
        setTimeout(function() {
          if(!navigator.connection) return;
          if(navigator.connection.type === "none"){
            angular.element(document.body).addClass("offline");
          }else{
            angular.element(document.body).removeClass("offline");
          }
        },200);
      }
    });

    // 处理安卓的物理back键
    $ionicPlatform.registerBackButtonAction(function (e) {
      // 寻找可见的back按钮，找到了触发点击，否则退出
      var backBtns = [].filter.call(document.querySelectorAll('.back-button'), function(btn) {
        return btn.clientWidth > 0;
      });

      if(backBtns.length === 0){
        if(indiplatform.isLightApp()){
          $rootScope.closeLAPP();
        }else{
          ionic.Platform.exitApp();
        }
      }else{
        $timeout(function() {
          angular.element(backBtns[0]).triggerHandler('click');
        });
      }
      return false;
    }, 101);
    // 启动时、app从后台切换到前台，检查js等代码更新
    if(location.protocol.indexOf("http")===0){
      // http、https 按旧逻辑检查更新
      $ionicPlatform.on("resume",function () {
        wwwinfoService.checkUpdate().then(function (ver) {
          var update = wwwinfoService.getVersion();
          if(ver!==update){
            // 找到更新，reload整个页面
            navigator.splashscreen && navigator.splashscreen.show();
            location.href = location.href.replace(location.hash,"").replace(location.search,"");
          }
        });
      })
    }else{
      // file cdvfile 等按新逻辑检查
      $ionicPlatform.on("resume",checkHtmlUpdate);
    }

    function checkHtmlUpdate() {
      // 没有Deploy插件，退出
      if(!window.IndimobileDeploy) return;
      UpdateService.check().then(function(res){
        if(!res) return;
        $ionicPopup.alert({
          title: '发现新的资源包，需要更新',
          template: '资源包大小：' + $filter('bytes')(res.size),
          okText: '更新'
        }).then(function(isOk) {
          if(!isOk) return;
          IndimobileDeploy.redirect("loader");
        });
      }, function(data){
        $ionicPopup.alert({
         template: data
        });
      });
    }
    document.addEventListener('invalid', function(e){
        // 禁用浏览器默认的表单验证效果
        e.preventDefault();
    }, true);
})
.config(function($httpProvider) {
  $httpProvider.interceptors.push(function($rootScope,$injector,$timeout,$q,$imCrypto,$filter) {
    return {
      // 生成几个和http请求相关的事件
      request: function(config) {
        // Crosswalk默认没有Accept-Language，会返回英文的日期格式
        config.headers["Accept-Language"] = "zh-CN,zh;q=0.8";

        // 如果未设置自定义timeout函数，增加通用的
        if((!config.timeout || angular.isNumber(config.timeout)) && isXhrByUser(config)){
          addTimtout(config);
        }

        config.real_url = config.url;
        if(config.method !== "JSONP"){
          var trans_url = $injector.get('$imUrl').transform;
          config.url = trans_url(config.url);
        }
        // 加密body内容，并修改url
        if(config.encryptBody){
          config.data = $imCrypto.encryptAes(config.data);
          config.url = config.url.replace("/_api/","/_api/_decrypt/");
        }

        $rootScope.$broadcast('$im.common.xhr.start',config);
        return config;
      },
      response: function(response) {
        // logintype === 0 登录页，表示身份认证失败
        var islogin=false;
        if(response.config && response.config.headers && response.config.headers.loginaction){
            islogin=true;
        }
        if(angular.isFunction(response.headers) && response.headers("logintype") === "0" && !islogin){
            $rootScope.$broadcast('$im.common.xhr.loginError',response);
        }
        $rootScope.$broadcast('$im.common.xhr.finish',response);
        return response;
      },
      requestError: function(config){
        $rootScope.$broadcast('$im.common.xhr.requestError',config);
      },
      responseError: function(response){
        if(response.status === 403 && response.headers("session-error")){
          // session 失效，发出错误通知
          var msg, err = response.data.result;
          if(err && err.status==="2"){
            msg = "您的账号于<b>" + $filter('imCalendar')(err.exitDate) +"</b>在一台<b>" + err.deviceType +"</b>设备登录。如非本人操作，则密码可能已经泄露，请及时修改密码。"
          }
          $rootScope.$broadcast('$im.common.xhr.loginError',response,msg);
        }
        $rootScope.$broadcast('$im.common.xhr.responseError',response);
        return $q.reject(response);
      }
    }

    // 为http request提供timeout和手工取消两种方式
    function addTimtout(config){
      var canceller = $q.defer();
      var timeout = config.timeout;
      config.timeout=canceller.promise;
      config.canceller = canceller;
      if(timeout){
        $timeout(function() {
          canceller.resolve();
        },timeout);
      }
    }
  })
})
.run(function($http, $rootScope, $ionicLoading, $timeout, $imLog) {

  var loadingCount = 0;
  $rootScope.$on('$im.common.xhr.start', function(evt,config) {
    // 不要求显示loading，直接返回
    if(!config.loading) return;
    loadingCount++;

    $ionicLoading.show({
      template: '<div ng-click="cancelXhr()"><ion-spinner class="spinnerContent" icon="ios"></ion-spinner>\
      <span class="loading-msg1">正在加载</span> <i class="icon ion-android-close"></i></div>',
      noBackdrop: false
    });
  })

  // 用点击取消所有xhr请求
  $rootScope.cancelXhr = (function(http){
    return function(){
      http.pendingRequests.forEach(function (req) {
        req.canceller && req.canceller.resolve();
      });
    }
  })($http);

  // 请求完成时，隐藏加载框
  $rootScope.$on('$im.common.xhr.finish', function(evt,response) {
    if(!response.config.loading) return;
    loadingCount--;
    if(loadingCount <= 0){
      $ionicLoading.hide();
    };
  })

  $rootScope.$on('$im.common.xhr.responseError', function(evt,response) {
    // 处理ws返回的错误
    var msg = "";
    var type = "";
    var failOk = false;
    if(response instanceof Error){
      type = "后台webservice返回了异常";
      msg = response.message;
    }else{
      switch (response.status) {
        case 0:
        case 200:
          type = "网络错误，请稍候重试";
          msg = response.config.real_url;
          // 已经断网，不再提示网络错误
          failOk = navigator.connection && navigator.connection.type === "none";
          break;
        case 504:
          type = "无法连接到后台服务器";
          msg = response.config.real_url;
          console.error(type + "\n" + msg);
          break;
        default:
          type = "处理请求时发生错误";
          msg = response.status + " " + response.statusText + "\n" +response.config.real_url;
      }
    }

    if(!isXhrByUser(response.config)) return;

    // 手工取消的请求，不显示错误
    var showError = !(response.config.timeout && response.config.timeout.$$state && response.config.timeout.$$state.status === 1);
    if(showError && !failOk){
      // 写入log窗口
      $imLog.error(type+"\n"+msg);
    }

    loadingCount--;
    if(loadingCount <= 0){
      $timeout(function(){
        $ionicLoading.hide();
      },0);
      // 发出下拉刷新完成的事件
      evt.currentScope.$broadcast('scroll.refreshComplete');
    }
  });
})
.run(function(amMoment) {
  amMoment.changeLocale('zh-cn');
  // 定制日期显示格式
  var _calendar = moment.localeData("zh-cn").calendar;
  moment.localeData("zh-cn").calendar = function(type,oMoment){
      var result = _calendar.apply(this, arguments);
    switch(type) {
        case "sameDay":
            result = result.replace("[今天]","");
            break;
        case "lastDay":
            result = '[昨天]';
            break;
        case "lastWeek":
            result = result.split("Ah")[0];
            break;
        case "sameElse":
          if(moment().year() === oMoment.year()){
            result = 'MoDo';
          }else{
              result = 'L';
          }
            break;
    }
      return result;
    }
})
.config(function($ionicConfigProvider) {
  // 修改ionic默认样式
  $ionicConfigProvider.backButton.previousTitleText(false).text('').icon('indi-fanhui');
  $ionicConfigProvider.form.toggle("large");
  $ionicConfigProvider.tabs.position('bottom').style("standard");
  $ionicConfigProvider.navBar.alignTitle('center');
})
.run(function ($state,$rootScope) {
    // 便于在表达式中判断当前state
    $rootScope.$state = $state;
}).config(function($imTranslateProvider) {
  $imTranslateProvider.preferredLanguage('zh_CN');
  $imTranslateProvider.useSanitizeValueStrategy(null);
}).config(function($httpProvider) {
  $httpProvider.interceptors.push(function($rootScope,$injector,$timeout,$q,$imWebflowDelegate) {
    return {
      response: function(response){
        var url = response.config.url.toLowerCase();
        if(url.indexOf("update-log")!==-1 && url.indexOf("htm")!==-1){//更新记录里面图片url处理
          response.data=response.data.replace(/src="/g,"src=\""+ $injector.get('$imUrl').transform("/_api/update-log")+"/")
            .replace(/<style/g,"<style scoped");  // css加上scoped属性
        }
        return response;
      }
    }
  });
}).run(function (validator, validationDomModifier, $q, defaultErrorMessageResolver,$imValidator) {
  // 注册错误信息DOM处理函数
  validator.setFocusInputError(false);
  validator.registerDomModifier(validationDomModifier.key, validationDomModifier);
  validator.setDefaultElementModifier(validationDomModifier.key);
  // 提取自定义validator的错误消息
  validator.setErrorMessageResolver(function (errorType, el) {
    // 先提取dom元素的属性上声明的错误信息
    var invalidmessage = el.attr("tmpinvalidmessage") || el.attr("invalidmessage");
    if(invalidmessage){
      return $q.resolve(invalidmessage);
    }
    // 再从$imValidator提取
    var validator;
    var validatorName = el.attr("customvalidator");
    if(errorType === "custom"){
      validator = $imValidator.get(validatorName);
    }else if(errorType === "customAsync"){
      validator = $imValidator.getAsync(validatorName);
    }

    if(validator && validator["errMsg"]){
      return $q.resolve(validator["errMsg"]);
    }

    return defaultErrorMessageResolver.resolve(errorType, el);
  });
}).run(function ($q, defaultErrorMessageResolver) {
  // 增加中文的错误提示
  defaultErrorMessageResolver.setCulture('zh_CN', function () {
    var result={};
    result.data = {
      "defaultMsg": "输入的内容有误",
      "email": "请输入正确的邮件地址",
      "minlength": "请至少输入{0}个字符",
      "maxlength": "您输入的字符超过{0}个",
      "min": "请输入大于{0}的值",
      "max": "请输入小于{0}的值",
      "required": "此值为必填项",
      "date": "请输入正确的日期",
      "pattern": "请输入符合以下模式的内容：{0}",
      "number": "请输入正确的数字",
      "url": "请输入正确的URL，例如http(s)://www.google.com"
    };
    return $q.resolve(result);
  });
}).provider('indiConfig', function() {
  // 系统内的可配置参数
  var provider = this;
  var configProperties = {
    authentication: {
      enableRestrict: false,  // 登录限制，仅白名单用户可登录
      enableBindDeviceUid: false,  // 登录限制，绑定设备uuid
      gesturePassword:{
        minLength:3,       // 手势密码最小长度
        maxAttempts:5      // 手势密码解锁错误次数
      },
      disableMultipleLogin: false  // 禁用用户在多个设备登录
    },
    display:{
      timedInfo:{
        timeout: 1000   // 自动消失提示信息的延迟
      },
      dateTime:{
        disableCalendarFormat: false  // 禁用“昨天”这种相对时间格式
      },
      showAndroidBadge:false
    },
    fileViewer:{
      saveToLocal:{
        enableWith:"none",  // 启用文件下载到本地：none、all、blacklist、whitelist
        blacklist:""
      }
    },
    modules:{
      workspace:{
        useTabNavigation: true, // 个人工作台是否使用tab形式的导航
        enableHomepage:false,
        showPromotionPage:"none",//启动推广页图片：none,all,wifi
        enableShortcut:false //捷径功能开关,默认关闭
      },
      mail:{
        disable: false  // 禁用邮件
      },
      contact:{
        disable: false,  // 禁用通讯录
        searchExtFiledName:"",
        showVcardFor:"",
        showDeptFirst:false//通讯录和选人列表部门放在最上方

      },
      toread:{
        disable: false,  //禁用待阅
        removeItemAfterOpen:true
      },
      startProcess:{
        disable: true   // 禁用流程新建
      },
      news:{
        disableType1: false,  // 废弃
        disableType2: false,   // 废弃
        viewNameForList:"vwPublicedByCat"  // 更换新闻列表视图
      },
      mywork:{
        filter: ""  // 对待办待阅等传递额外的查询语句，过滤出一部分内容
      },
      search:{
        hideModuleSelector: false  // 隐藏搜索页面 切换类型的导航
      },
      webflow:{
        huiqianFinishShowMaindocFlowinfo: false, // 废弃
        huiqianShowMaindocFlowinfo: false, // 会签文件显示主文档的流转信息
        enableHuiqianStart: false,  // 启用发起会签功能
        actionBtn:{
          moveToSubmitPage: false   // 将更多操作按钮，移动到提交页展示
        },
        passOrDenyMode:{
          showCommentModal:false
        },
        yijianList:{
           moveToFormTab:false
        },
        zhihuiNotify:{
          mail:true,
          sms:false,
          toread:true
        },
        submit:{
          doubleCheckWhenNoOptionFlowSubmit:true,
        },
        enableQRCode:false,
        enablePassOrDenyMode:false,   //  footer同意,不同意button
        mergeAttachTab: false,   // 合并正文、附件两个tab页
        enableVoiceComment:false, //语音意见开关
        enableFileComment:false,   //意见附件开关
        showMainFileOnTabClick:false,//直接打开正文
        zhiHuiInfoInit:true,  //打开表单时是否加载知会记录
        returnSubmitPage: false // 填写意见点击确定回到提交页面
      },
      map:{
        apiKey:"F7WBZ-4NWHP-D6ZDH-LURHL-4P6ME-LUF46"  // 互联网地图组件的api key
      },
      homepage:{
        bannerImages:false
      },
      entrust:{
        disable: true, //禁用委托功能
      },
    },
    dynamicGrid:{
      promptAddNewOnSave:true
    },
    tabs:{
      enableSwipeNavigation:"none"//tab页签滑动翻页
    }
  };
  createConfig(configProperties, provider, '');
  provider.$get = function() {
    return provider;
  };
  // 为每个属性生成 get/set 函数
  function createConfig(configObj, providerObj, platformPath) {
    angular.forEach(configObj, function(value, namespace) {

      if (angular.isObject(configObj[namespace])) {
        // 递归调用处理下一层
        providerObj[namespace] = {};
        createConfig(configObj[namespace], providerObj[namespace], platformPath + '.' + namespace);

      } else {
        // 生成 get/set 函数
        providerObj[namespace] = function(newValue) {
          if (arguments.length) {
            configObj[namespace] = newValue;
            return providerObj;
          }else{
            return configObj[namespace];
          }
        };
      }

    });
  }
}).config(function($stateProvider){
  function stateShowInMainView(state) {
    // 递归判断当前state是否显示在manview中
    if(state.self.views && state.self.views.hasOwnProperty("main-view")){
      return true;
    }else{
      return state.parent && stateShowInMainView(state.parent);
    }
  }
  $stateProvider.decorator('views', function (state, _default) {
    // 每个state都依赖custom.html，确保扩展的内容此时已经加载进来
    state.resolve["_customTemplate_"] = function($templateRequest){
      return $templateRequest('../_custom/template/custom.html',true);
    }
    // 确保加密的key已经加载
    state.resolve["_getEncryptKey_"] = function($imCrypto){
      return $imCrypto.getEncryptKey();
    }
    var views = _default(state);
    // 对于tab.开头的state，自动注册一个不在tab下的state。适应tab过多后被移动到更多tab下的场景
    if(state.name.indexOf("tab.") === 0){
      // 拷贝原始设置项
      var stateConfig = angular.copy(state.self);
      var newViews = {};
      angular.forEach(stateConfig.views, function (config, name) {
        // 如果viewname包含tab，将views替换为main-view
        if(name.indexOf("-tab") !== -1){
          newViews["main-view"] = config;
        }else{
          newViews[name] = config;
        }
      });
      stateConfig.views = newViews;
      $stateProvider.state(state.name.replace("tab.",""), stateConfig);
    }
    // 非Pad版，将full-view等恢复到main-view
    if(!window.isPad){
      ["full-view","main-side-view","side-view"].forEach(function(viewName){
        viewName += "@";
        if(views.hasOwnProperty(viewName)){
          views["main-view@"] = views[viewName];
          delete views[viewName];
        }
      });
    }else{
      var emptyView = {
        templateUrl: 'app/workspace/empty-view.html'
      }
      if(!state.self.abstract && stateShowInMainView(state)){
        // 进入main-view，同时侧边显示占位符（抽象的state不需要处理）
        views["side-view@"] = {
          templateUrl: 'app/workspace/placeholder.html'
        };
      }else if(views.hasOwnProperty("full-view@")){
        // 进入full-view，确保其他view进入cache状态
        views["main-side-view@"] = views["side-view@"] = views["main-view@"] = emptyView;
      }
    }

    return views;
  });
}).run(function(indiConfig,$rootScope,$http){
  // 将已经禁用的功能模块 对应的tab去掉
  $rootScope.$on('$im.workspace.maintab.loaded', function(evt,tabUtil) {
    if(indiConfig.modules.mail.disable()){
      tabUtil.remove("mail");
    }
    if(indiConfig.modules.news.disableType1()){
      tabUtil.remove("newstype0");
    }
    if(indiConfig.modules.news.disableType2()){
      tabUtil.remove("newstype1");
    }
    if(indiConfig.modules.startProcess.disable()){
      tabUtil.remove("start-process");
    }
    if(indiConfig.modules.contact.disable()){
      tabUtil.remove("contacts");
    }
  });
  // 增加pad标识
  var isPad = window.isPad;
  $rootScope.$indimobile = {
    '$isPad':isPad ,
    '$isIPhoneX':indiplatform.isIPhoneX(),
    '$isLightApp':indiplatform.isLightApp(),
    '$isLocalHtml':indiplatform.isLocalHtml(),
    '$enableMail':!indiConfig.modules.mail.disable(),
    '$enableContact':!indiConfig.modules.contact.disable(),
    '$enablenewstype0':!indiConfig.modules.news.disableType1(),
    '$enablenewstype1':!indiConfig.modules.news.disableType2()
  };
  if(isPad){
    angular.element(document.body).addClass("device-pad");
    indiConfig.modules.workspace.useTabNavigation(false);
  }
  if(indiplatform.isIPhoneX()){
    angular.element(document.body).addClass("device-iphonex");
  }
  if(!imLocalStorage.getItem("imDeviceId")){//设置一个appid,账号设备绑定用
    // var s=new Date()
    // imLocalStorage.setItem("imDeviceId",s.getTime().toString());
    // modified by kai
    // fix the deviceId as the one of iphone12:1655534777639
    imLocalStorage.setItem("imDeviceId","1658806666956");
    // modified by kai
  }
  $rootScope.$indimobile.$appId=imLocalStorage.getItem("imDeviceId");

  var devicetype = "other"
  if (ionic.Platform.isAndroid()) {
      devicetype = "Android"
  }
  if (ionic.Platform.isIOS() || ionic.Platform.isIPad()) {
      devicetype = "ios"
   }
  $rootScope.$indimobile.$wsloginfo={
          "strActionID":$rootScope.$indimobile.$appId,
          "strInvokerID":"移动办公专业版",
          "strInvokerClient":devicetype
  };
  if (window.wx) { //依赖借口返回值
    wx.config({
      beta: true, // 必须这么写，否则在微信插件有些jsapi会有问题
      debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
      appId: wxconfig.appid, // 必填，企业微信的corpID
      timestamp: wxconfig.timestamp + "", // 必填，生成签名的时间戳
      nonceStr: wxconfig.noncestr, // 必填，生成签名的随机串
      signature: wxconfig.signature, // 必填，签名，见[附录1](#11974)
      jsApiList: ['onHistoryBack', 'hideOptionMenu', "closeWindow", 'hideMenuItems', 'hideAllNonBaseMenuItem'] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
    });
    wx.ready(function() {
      // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
      wx.hideOptionMenu && wx.hideOptionMenu();
      wx.hideAllNonBaseMenuItem &&  wx.hideAllNonBaseMenuItem();
      wx.onHistoryBack &&　wx.onHistoryBack(function() {
        indiplatform.emitBackBtnEvent()
        return false
      });
    });
  }
  if(window.dd){
    dd.ready(function(){
      dd.biz.navigation.setRight({
        show: false,//控制按钮显示， true 显示， false 隐藏， 默认true
        control: true,//是否控制点击事件，true 控制，false 不控制， 默认false
        text: '发送',//控制显示文本，空字符串表示显示默认文本
        onSuccess : function(result) {
        },
        onFail : function(err) {}
      });
    })
  }
}).value("CONFIG", {
  "DOM_ROOT": "/_api"
});
window.indiplatform = window.indiplatform || {};
// 加载其他js、css
indiplatform.loadResources = function(resources) {
  if(!angular.isArray(resources)) resources = [resources];
  resources.forEach(function(res){
    var type = res.split(".").pop();
    indiplatform.loadResource(res,type);
  });
}
indiplatform.loadResource = function(filename, filetype){
  // 没有带_custom，自动加上
  if(filename.indexOf("_custom")===-1) filename = "../_custom/" + filename;
  if (filetype=="js"){
    document.write('<script type="text/javascript" src="'+filename+'"><\/script>');
  }
  else if (filetype=="css"){
    var fileref=document.createElement("link");
    fileref.setAttribute("rel", "stylesheet");
    fileref.setAttribute("type", "text/css");
    fileref.setAttribute("href", filename);
    document.getElementsByTagName("head")[0].appendChild(fileref);
  }
}
indiplatform.deprecatedWarning = function (oldMethod, newMethod) {
  // 废弃方法的警告信息
  var warn = console.warn || console.log;
  warn && warn.call(console, oldMethod + ' 已废弃，请使用新的 ' + newMethod + ' 代替');
}
indiplatform.deprecatedService = function (service,oldName,newName) {
  // 自动生成废弃service
  var ret = {};
  for(var method in service){
    ret[method] = (function(method){
      return function(){
        indiplatform.deprecatedWarning(oldName,newName);
        return service[method].apply(service,arguments);
      }
    })(method);
  }
  return ret;
}
// 轻应用相关标记
indiplatform.isLightApp = function() {
  // mobile_www_lapp表示一般的轻应用嵌入，本地包+serverurl参数 表示 微门户
  return (location.href.indexOf("mobile_www_lapp_") !== -1) || (indiplatform.isLocalHtml() && location.search.indexOf("serverurl=")!==-1)
}
// 本地缓存标记
indiplatform.isLocalHtml = function() {
  return location.protocol.indexOf("http")!==0
}
//是不是微信
indiplatform.isWeiXin = function() {
  //window.navigator.userAgent属性包含了浏览器类型、版本、操作系统类型、浏览器引擎类型等信息，这个属性可以用来判断浏览器类型
  var ua = window.navigator.userAgent.toLowerCase();
  //通过正则表达式匹配ua中是否含有MicroMessenger字符串
  return ua.match(/MicroMessenger/i) == 'micromessenger'
}
//是不是Crosswalk
indiplatform.isCrosswalk = function() {
  var ua = window.navigator.userAgent.toLowerCase();
  return ua.toLowerCase().indexOf("crosswalk") != -1
}
indiplatform.isDingTalk = function() {
  var ua = window.navigator.userAgent.toLowerCase();
  return ua.toLowerCase().indexOf("dingtalk") != -1
}
indiplatform.checkWebview =function(){
  if(!( indiplatform.isWeiXin()||indiplatform.isCrosswalk()||ionic.Platform.isIOS()||indiplatform.isDingTalk() )){
    setTimeout(function(){
      alert("经检测未集成CrossWalk,请参考在线开发手册的《第三方APP集成条件说明》!")
    })
  }
}
//检测是否为iPhoneX
indiplatform.isIPhoneX = function() {
  return ionic.Platform.isIOS() && (screen.height == 812 && screen.width == 375);
}
ionic.Platform.ready(function() {
  if(indiplatform.isLightApp()){
    indiplatform.checkWebview()
  }
});

// 发布backbutton事件
indiplatform.emitBackBtnEvent = function() {
  var e = document.createEvent("Events");
  e.initEvent("backbutton", false, false);
  document.dispatchEvent(e);
}

// 将慧信的back事件，转成ionic形式的
function customgoback() {
  indiplatform.emitBackBtnEvent();
}

// 将mau门户的back事件，转成ionic形式的
function BackOff() {
  indiplatform.emitBackBtnEvent();
}

// 区分用户发出的数据请求 或 ionic发出的模板请求
function isXhrByUser(config){
  return config.url.indexOf("app/")!==0;
}

// 增加一个formCtrl方法，注册编辑表单的controller
angular.origModule = angular.module;
angular._formCtrls = {};
angular.module = function () {
  var mod = angular.origModule.apply(this, arguments);

  // 检查controller是否存在
  mod._checkFormCtrl = function (name) {
    return angular._formCtrls[name];
  }
  mod.formCtrl = function (name, constructor) {
    angular._formCtrls[name] = true;
    return this.controller("mform_" + name, constructor);
  }
  return mod;
};

(function(){
// jqLite `.parent([selector])` 支持 selector
var $ = angular.element;
var _parent = $.prototype.parent;
var _find = $.prototype.find;
$.prototype.parent = function(sel) {
  // 没传sel，使用原版
  if(!sel) return _parent.apply(this);
  if(!this.length) return this;
  var  currentNode = this[0], ret;
  while(currentNode && currentNode.nodeName !== 'HTML') {
    currentNode = currentNode.parentNode;
    if(currentNode.webkitMatchesSelector(sel)) {
      ret = currentNode;
      currentNode = document.documentElement;
      continue;
    }
  }
  return $(ret);
}

// jqLite `.find([selector])` 支持 selector
$.prototype.find = function(sel) {
  var tagRegexp = /^[a-z-]+$/i;
  // 没传sel 或 元素选择器，使用原版
  if(!sel || tagRegexp.test(sel)) return _find.call(this,sel);
  if(!this.length) return this;
  var list = [].slice.call(this[0].querySelectorAll(sel));
  return $(list);
}
// 改用isContentEditable属性，可以从父元素继承
var _old_isTextInput = ionic.tap.isTextInput;
ionic.tap.isTextInput = function(ele){
  var ret = _old_isTextInput(ele);
  return ret || (!!ele && ele.isContentEditable);
}
})()
//由于屏幕旋转时未触发resize事件,此处添加 wangwz
window.addEventListener("orientationchange",function(){
  ionic && ionic.trigger("resize");
});