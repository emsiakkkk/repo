// domino 平台专用的代码
// 将dojo rpc服务包装成angular服务 obj.serviceURL提供服务的URL obj.methods注册的方法
indiplatform.dojoRpcWrapper = function (obj) {
  var url = obj.serviceURL;
  return function ($http){
    var result = {};
    // 生成所有方法的实际函数
    obj.methods.forEach(generateMethod,result);
    return result;

    function generateMethod(method){
      this[method] = function () {
        // 直接组装方法名、参数并post出去
        return $http.post(url,{
          method: method,
          params: [].slice.call(arguments)
        }).then(function(res){
          return res.data.result;
        });
      };
    }
  }
};
angular.module('indiplatform.domino', [
  'DominoSoap',
  'x2js',
  'indiplatform.login',
  'indiplatform.workspace',
  'indiplatform.todo',
  'indiplatform.webflow',
  'indiplatform.mail',
  'indiplatform.contact',
  'indiplatform.new',
  'indiplatform.search',
  'indiplatform.setup',
  'indiplatform.create',
  'indiplatform.entrust'
])
.config(function($imTranslateProvider) {
  $imTranslateProvider.translations('zh_CN', {
    im:{
      common:{
        app_name: 'Indi.Mobile专业版'
      }
    }
  });
})
.directive('yjShow', function (CONFIG,$imUrl) {
 var yjdom;
 return {
   restrict: "EA",
   template: function(cope, element, attrs, ctrl){
     return '<div ng-include="template"></div>'
   },
   scope:true,
   controller: function($scope, $element, $attrs, $http, $templateCache,$timeout,$filter, $imUrl) {
     var templateId = "templateYjViewer"+Math.random().toString(16).substring(2)+".html";
     var res = document.createElement("div");
     var  newVal,newValfmt;
     if($attrs.formyj=="yes"){
       newVal = $attrs.yjShow
       newValfmt = ""
     }else{
       newVal=$scope.$eval($attrs.yjShow).value||$scope.$eval($attrs.yjShow).yj||$scope.$eval($attrs.yjShow).yjvalue;
       newValfmt  = $scope.$eval($attrs.yjShow).fmtvalue;
       var newValfmtFkyj = [];
       angular.forEach($scope.$eval($attrs.yjShow).fmtvalue,function(item,index){
        if(item.fkyj){
          //已经中的部门信息
          var dep = item.dep;
          angular.forEach(item.fkyj,function(yj){
            //判断意见中是否含有部门
            if(dep && !yj.dep){
               yj.dep = dep;
            }
            newValfmtFkyj.push(yj)
          })
         newValfmt = newValfmtFkyj
        }
       })
     }
     var customYj="";
     var data = {
       subform:$scope.formData.subform[0],
       dbpath:$scope.fileinfo.dbpath,
       fldTypeId:$scope.formData.typeid[0],
       fldtype:$scope.formData.type[0],
       fldValue:newVal,
       fldJsonValue:newValfmt,
       fldName:$scope.$eval($attrs.fldname),
       extend:$scope.formData.extend,
       setRenderFn:function(callback){
         customYj=callback(newVal);
       }
     }
     $scope.$emit("$im.webflow.yjField.beforeShow",data);
     if(customYj!=""){
       $templateCache.put(templateId, customYj);
       $scope.template = templateId;
       return
     }
     if(!newVal || !newVal[0] || newVal[0]=="") return;
     if(typeof(newVal)=='string'){
       //替换意见中的换行字符
       newVal = newVal.replace(/\n/g, "<br>");
       //替换已经中的空格
       newVal = newVal.replace(/ /g, "&nbsp;");
       newVal=[newVal];
     }
     $scope.yjatt =[];
     var host = $imUrl.getHost($scope.fileinfo.domain,$scope.fileinfo.protocol);
     if (newValfmt && newValfmt.length > 0) {
       var yjhtml = '';
       newValfmt.forEach(function (item, index) {
        item.spyj = item.spyj ?item.spyj.replace(/</g,"&lt;").replace(/>/g,'&gt;').replace(/&lt;br&gt;/g,"<br/>"):"";
         yjhtml =  yjhtml + '<table width="100%" border="0" data-user="' + item.user + '" data-time="' + item.time + '"><tbody>'
         yjhtml = yjhtml + '<tr><td>' + (item.spyj?item.spyj:"")+ '</td></tr>'
         if ((item.yjatt && item.yjatt.length > 0) || item.yjpic) {
          if(item.yjatt && item.yjatt.length > 0){
            //为意见中的附件添加域名
            var attrUrl = item.yjatt[0].atturl;
            if(attrUrl.indexOf($scope.fileinfo.domain) == -1){
                attrUrl = host + attrUrl;
            }
            $scope.yjatt[index] ={
               "name":item.yjatt[0].attname,
               "attname":item.yjatt[0].attname,
               "atturl":attrUrl,
               "url":attrUrl,
               "catnum":"-5"
             }
            yjhtml = yjhtml + '<tr class="yjAttAndPic"><td><div ng-init="yjatts=[yjatt['+index+']]"><p ng-repeat="att in yjatts " class="att" im-att-view="att"></p></div>'
  
          }else{
            $scope.yjatt[index] = {
               "name":"",
               "attname":"",
               "atturl":"",
               "url":"",
               "catnum":"-5"
             }
            yjhtml = yjhtml + '<tr class="yjAttAndPic"><td><div class="att"></div>'
          }
           if (item.yjpic) {
             yjhtml = yjhtml + '<img ng-src="' + $imUrl.transform(host+item.yjpic)+ '">'
           }
           yjhtml = yjhtml + '</td></tr>'
         }
         var signpicurl = item.usersignpic? $imUrl.transform(host+item.usersignpic):""
         var  userSign= signpicurl?('<img height="50px" alt="admin" title="'+item.user +'" ng-src="'+signpicurl+' ">'): '<span im-dom-user>'+item.user +'</span>'
         if(item.signtmpl){
             item.signtmpl=item.signtmpl.replace(/{user}/ig,userSign);
             //判断是否有职位
             if(item.hasOwnProperty("jobtitle")) {
                item.signtmpl=item.signtmpl.replace(/{jobtitle}/ig,item.jobtitle);
             }
             item.signtmpl=item.signtmpl.replace(/{dept}/ig,"<im-dom-dept-inner>"+item.dep+"</im-dom-dept-inner>");
             item.signtmpl=item.signtmpl.replace(/{time}/ig,item.time);
             if(item.signtmpl.match(/\{time=([^}]+)\}/)){
               item.signtmpl = item.signtmpl.replace(/\{time=([^}]+)\}/, item.timefmt);
             }
             yjhtml = yjhtml + '<tr signtmpl=""><td align="right"><div align="right">'+item.signtmpl+' </div></td></tr>'
         }else{
             yjhtml = yjhtml + '<tr signtmpl="" signpic="' +signpicurl + '" >'
             yjhtml = yjhtml + '<td align="right"><div class="sign">'
              yjhtml = yjhtml + userSign
             yjhtml = yjhtml + '<br>' + item.time + '</div></td></tr>'
         }
         yjhtml = yjhtml + '</table>'
       })
       angular.element(res).append(yjhtml); //res.appendChild( angular.element(yjhtml)[0]);
       $templateCache.put(templateId, res.innerHTML);
       $scope.template = templateId;
       return
     }
     var hasHtml=newVal.some(function(tb){//判断里面有html标签，如果有人员就竖着排，如果没有就横着排
       return typeof(tb) === 'string' && tb[0]=="<"
     })
     var yjs=[]
     newVal.forEach(function(tb, index) { //一个值是多个table拼成的字符串
         if (typeof(tb) === 'string' && tb[0] == "<") {
          tb = tb.replace(/ src="/g,' ng-src="');
         if (tb.indexOf("<table") > -1) {
             for (var i = 0; i < angular.element(tb).length; i++) {
                 yjs.push(angular.element(tb)[i].outerHTML)
             }

         } else {
             yjs.push(tb)
         }
         } else {
             yjs.push(tb)
         }
     })

     var $index = 0;
     yjs.forEach(function(tb,index){//处理每个意见table
       if(typeof(tb) === 'string' && tb[0]=="<"){//html标签
        if(newValfmt == undefined && !$scope.$eval($attrs.yjShow).yj) {
         //非流转意见和没有开启搜素配置意见域
         tb=angular.element(tb);
         angular.forEach(tb.find('td'),function(i,index){
           if(i.innerHTML.trim() == ""){
             if( i.parentNode.childNodes.length == 1){
               i.parentNode.remove();
             }
             i.remove();
           }
            if(index == 0 ) {
              i.innerHTML = i.innerHTML.replace(/</g,"&lt;").replace(/>/g,'&gt;').replace(/&lt;br&gt;/g,"<br/>");
            }
         })
         angular.forEach(tb.find('a'),function(a){//处理附件和图片
           if(a.attributes.href&&~a.attributes.href.value.indexOf('OpenMyFile')){
              angular.forEach($scope.idxfiles,function(fujian){
                if(a.attributes.title.value.indexOf(fujian.name)!=-1) {
                  $index+=1
                  $scope.yjatt.push(
                    {
                     "name":fujian.name,
                     "attname":fujian.name,
                     "atturl":fujian.url,
                     "url":fujian.url,
                     "catnum":"-5"
                   }
                  )
                }
             })
             var attnode='<div  class="att" im-att-view="yjatt['+($index-1)+']"></div>'
             a.parentNode.appendChild(angular.element(attnode)[0]);
             a.remove();
           }
           if(a.attributes.onclick&&~a.attributes.onclick.value.indexOf('$file')){
             var imgpath=a.attributes.onclick.value.match(/("|')\/.*?("|')/)[0].split(/\"|\'/)[1];
             imgpath=$imUrl.transform(host+imgpath);
             var attnode='<img  ng-src='+imgpath+'>'
             a.parentNode.appendChild(angular.element('<br/>')[0]);
             a.parentNode.appendChild(angular.element(attnode)[0]);
             a.remove();
           }
         })
         angular.forEach(tb[0].querySelectorAll(".userName"),function(span){//用户名
           span.parentNode.style['padding-right']="5px";
           span=angular.element(span);
           span.after("<br>");
         })
         angular.forEach(tb.find('img'),function(img){////手签名
           if(img.attributes['ng-src']&&img.attributes['ng-src'].value.indexOf('signature')>0){
             img=angular.element(img);
             img.attr('src',$imUrl.transform(host+img.attr('ng-src')));
             img.attr('ng-src',$imUrl.transform(host+img.attr('ng-src')));
             img.after("<br>");
           }
         })
         if(tb[0].children.length==0&&tb[0].tagName=='SPAN'){//用户写入域
           tb[0].innerHTML=$filter('domUser')(tb[0].innerHTML);
         }
         if(tb[0].children.length==0&&tb[0].tagName=='IMG'){//用户写入域图片
           img=angular.element(tb[0]);
           img.attr('src',$imUrl.transform(host+img.attr('ng-src')));
           img.attr('ng-src',$imUrl.transform(host+img.attr('ng-src')));
         }
         res.appendChild(tb[0]);
         if(tb[1]){//用户写入域时间
           res.appendChild( document.createElement("br"))
           res.appendChild(tb[1]);
           res.appendChild( document.createElement("br"))
         }
        }else {
          tb = tb.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;br&gt;/g,"<br/>")
          var userdiv= document.createElement("div");
          userdiv.innerHTML=tb;
          res.appendChild(userdiv);
        }
       }else{//用户名
         if($attrs.class=="yj-text" ){//流转意见里的意见比较特殊
           tb=tb=="NoAttitude_Handler"?"无":tb;
            tb = tb.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;br&gt;/g,"<br/>")
           if(tb.indexOf("NoAttitude_Handler")>=0){
             tb = tb.replace("NoAttitude_Handler","");
           }
           var userdiv= document.createElement("div");
           userdiv.innerHTML=tb;
           res.appendChild(userdiv);

         }else{
           var userspan=""
           if(tb){
              userspan="<span im-dom-user>"+tb+"</span>"
           }
           res.appendChild(angular.element(userspan)[0]);
           if(hasHtml){
             res.appendChild(document.createElement("br"))
           }else{
             var span=document.createElement("span");
             span.innerText=(index==newVal.length-1?"":",");
             res.appendChild(span);
           }
         }
       }

     })
     $templateCache.put(templateId, res.innerHTML);
     $scope.template = templateId;
   }
 }
})
.directive('signDept',function(CONFIG) {
 return {
   restrict: "C",
   compile: function(scope,element,attrs) {
      var content = element.$$element[0].innerHTML;
      if(content) {
        element.$$element[0].innerHTML = "<im-dom-dept-inner>"+ content + "</im-dom-dept-inner>";
      }
   }
 }
})
.directive('moreTabs', function($timeout) {
  return {
      restrict: 'A',
      link: function(scope,element,attrs) {
          var mob=angular.element('<div class="indi-gengduo has-header"></div>');
              mob.bind('click', function(e){
                  scope.$apply('allTabs()');
                  var body = element.parent('body');
                  var screenHeight,scrollHeight;
                  var screenContent = body.find('ion-nav-view ion-view .scroll-content');
                  var scrollContent = body.find('.popover-wrapper ion-popover-view .scroll-content .list');
                  var popover =  element.parent('body').find('ion-popover-view .scroll-content');
                  var scrollbar = body.find('.popover-wrapper ion-popover-view .scroll-content .scroll-bar-indicator')
                  angular.forEach(screenContent, function(item){
                    if(item.clientHeight!=0){
                      screenHeight = item.clientHeight;
                    }
                  });
                  angular.forEach(scrollContent, function(item){
                    if(item.clientHeight!=0){
                      scrollHeight = item.clientHeight;
                    }
                  });
                  angular.forEach(popover, function(item){
                    item.style.maxHeight = (screenHeight-40) + 'px'
                  });
                  if(scrollHeight>screenHeight){
                    scrollbar.removeClass('scroll-bar-fade-out');
                    $timeout(function(){
                      scrollbar.addClass('scroll-bar-fade-out');
                    },1000)
                  }
              });
              element[0].firstElementChild.appendChild(mob[0]);
              element.find("span[class='tab-after']")[0].style.position='relative';
              element.find("span[class='tab-after']")[0].style['right']="2px"
      }
  }
})
.directive('lzxxitem', function($timeout,$compile,$q,$http,x2js,$filter,$ionicScrollDelegate) {
  return {
      restrict: 'C',
      link: function(scope,element,attrs) {
       //return
        if(scope.lzxx.subitem){
              var subitems=angular.element( '<div class="subitems" style="display:none">'
                                              +  '<div class="subitem" ng-repeat="lz in lzxx.subitem">'
                                              +     '<div>{{$index+1}}){{lz._user|imDept}}</div>'
                                              +      '<div>接收人：<span im-dom-user="lz._recipient"></span></div>'
                                              +  '</div>'
                                              +'</div>')
              element.after(subitems);
              $compile(subitems)(scope);
              element.bind("click",function(){
                if(element.next()[0].style.display=="none"){
                    element.next()[0].style.display=""
                    element.addClass("lzxxitem-show");
                }else{
                    element.next()[0].style.display="none"
                    element.removeClass("lzxxitem-show");
                }
                $ionicScrollDelegate&&$ionicScrollDelegate.resize();
                var subitemschilds=element.next().children();
                if(subitemschilds.length>=2 && angular.element(subitemschilds[1]).hasClass("subitemdetail")){//判断是否获取了每条会签文档的详细信息
                  return
                }
                var lzs=[];
                angular.forEach(subitemschilds,function(item){
                  lzs.push(angular.element(item).scope().lz);
                })
                $q.all(
                    lzs.map(function(lz){//获取每条会签的文档的流转信息
                        return $http({
                                  method:"GET",
                                  url:lz._serverdomain+lz._url
                                })
                    })
                ).then(function(rets){
                    return rets.map(function(ret){
                        var rundata=x2js.xml_str2json(ret.data).rundata;
                        rundata.flowinfo.item.length?"":rundata.flowinfo.item=[rundata.flowinfo.item];
                        var sublzs="";
                        rundata.flowinfo.item.forEach(function(sublz){
                           sublzs= sublzs + '<div class="subflowinfo">'
                                          + '<div class="subtime-item">'+$filter("amDateFormat")(sublz._time,'YYYY-MM-DD HH:mm:ss')+'</div>'
                                          + '<div class="subcontent-item">'+sublz._stat+'('+'<span im-dom-user>'+sublz._user+'</span>'+')'
                                          + (sublz._clienttype=="移动办公专业版"?'<i class="client-tip icon indi-shouji"></i>':'')
                                          + '</div></div>';
                        })
                        return '<div class="subitemdetail" id="dqclr">'
                              +'<div >当前处理人:<span im-dom-user>'+rundata.curitem._alldealer+'</span></div><div>当前处理状态:'+rundata.curitem._stat+'</div>'
                              +sublzs
                              +'</div>'
                    })
                }).then(function(dom){
                    angular.forEach(subitemschilds,function(item,index){
                      angular.element(item).after(dom[index]);
                    })
                    $compile(dqclr)(scope)
                    $ionicScrollDelegate&&$ionicScrollDelegate.resize();
                })
              })
        }
      }
  }
})
.config(function($httpProvider) {
  $httpProvider.defaults.transformResponse.unshift(function(data, headers){
    // domino readviewentries&OutputFormat=JSON 输出的JSON格式有问题，将\>替换回>
    var contentType = headers('Content-Type');
    if (contentType && contentType.indexOf('application/json') === 0 && data.indexOf("@toplevelentries")!==-1) {
      data = data.replace(/\\>/g,">");
    }
    if (contentType && contentType.indexOf('text/xml;') === 0 && data.indexOf("<?xml")!==-1) {//unicodeD800-DFFF都去掉特殊字符xml不支持
      var unicodes=data.match(/&#5(\d+)?;/g)//["&#55357;", "&#56658;"]
      if(unicodes){
          var unicode;
          unicodes.forEach(function(item){
              unicode=item.replace("&#","").replace(";")
              if(unicode>="55296"||unicode<="57343"){
                data=data.replace(item,"")
              }
          })
      }
    }
    return data;
  });
    // 从编辑表单中截取有意义的部分，抛弃domino生成的部分
  $httpProvider.interceptors.push(function($rootScope,$injector,$timeout,$q,$imWebflowDelegate) {
    return {
      response: function(response){
        var url = response.config.url.toLowerCase();
        // 通过frmwebflow-mobile打开的是编辑表单
        if(url.indexOf("frmwebflow-mobile")!==-1){
          var data = response.data;
          //过滤domino的ecblank.gif 图片
          if(data.indexOf("/icons/ecblank.gif")!==-1){
             data = data.replace("/icons/ecblank.gif","")
          }
          data = data.substring(data.indexOf("<mform"),data.indexOf("</mform>"));
          // 提取编辑/只读模式
          var mode = url.indexOf("?edit")!==-1?"edit":"read";
          // 提取必填域
          var requiredField = $imWebflowDelegate.getRequiredField().join(',');
          // allowInvalid 即使校验不通过，也更新model值，便于计算字段之间的关联关系
          data = data.replace("<mform", "<mform ng-model-options='{ allowInvalid: true}' mode='" + mode + "' required-field='"+requiredField+"'");
          response.data = data;
        }
        return response;
      }
    }
  });
})
.run(function(amMoment) {
  // Domino时间格式的预处理
  amMoment.preprocessors["domino"] = function(value, format){
    return moment(value,format||"YYYYMMDDHHmmss");
  }
})
.constant('angularMomentConfig', {
    preprocess: 'domino'
})
.filter('domUser', function() {
  // 处理Domino用户名的显示，包含多值的处理
  return function(input) {
    return [].concat(input).map(function(str){
      str = str || "";
      if(str.indexOf("cn=") !=-1){
        return str.split(/\/|%/)[0].replace("cn=","");
      }
      else{
        return str.split(/\/|%/)[0].replace("CN=","");
      }
    }).join(",");
  };
})
.filter('imDomUser', function() {
  // 处理Domino用户名的显示，包含多值的处理
  return function(input) {
    return [].concat(input).map(function(str){
      str = str || "";
      if(str.indexOf("cn=") !=-1){
        if(str.match(/\d+/g)){
          return str.split(/\/|%/)[0].replace(str.match(/\d+/g)[0],"");
        }
        return str.split(/\/|%/)[0].replace("cn=","");
      }
      else{
        if(str.match(/\d+/g)){
          return str.split(/\/|%/)[0].replace("CN=","").replace(str.match(/\d+/g)[0],"");
        }
        return str.split(/\/|%/)[0].replace("CN=","");
      }
    }).join(",");
  };
})
.directive('domUser', function (domUserFilter) {
  // 显示用户名
  return {
    compile: function(tElement,attr){
      tElement.removeAttr("dom-user");
      if(tElement.children().length===0){
        tElement.text(domUserFilter(tElement.text()));
      }
    }
  };
})
.directive('imDomUser',function($ionicScrollDelegate){
  // 处理Domino用户名
  function toArray(val){
    // 将各种情况的多值，转换为数组
    if(angular.isUndefined(val)) return val;
    return angular.isArray(val)?val:val.split(/;|,/g);
  }
  function linkFn(scope, element, attrs){
    scope._toArray = toArray;
    scope.num = element.attr('num')
    if(scope.num && parseInt(scope.num)>10){
      scope.pickDown = true
      scope.hideShow=function(){
        scope.pickDown = !scope.pickDown
        if(scope.pickDown ){
          element.addClass("im-dom-user");
        }else{
          element.removeClass("im-dom-user");
        }
        $ionicScrollDelegate.$getByHandle('webflow').resize()
      }
    }
  }
  function templateFn(element, attr){
    var num;
    var hideShow="";
    if(attr.imDomUser==""){
      num=element.html().split(/;|,/g).length
      if(num>10){
        hideShow='<div ng-click="hideShow()" class="selectItemShowMore">'+
                      '<a ng-show="pickDown">点击展示更多</a>'+
                      '<a ng-hide="pickDown">折叠</a>'+
                  '</div>'
        element.addClass("im-dom-user");
        element.attr('num',num);
      }
    }
    var exp = attr.imDomUser || ('::"' + element.html() + '"');
    // 拼接ng-repeat的表达式
    exp = "_u in " + exp.replace(/^(::)?/, "$1_toArray(") + ") track by $index+_u";
    return "<span class='user-wrapper' ng-repeat='" + exp + "'><im-dom-user-inner expression='_u'></im-dom-user-inner></span>"+hideShow;
    // modified by kai
    // CN=莫荣胤/O=gcable【已收未办】
    // return "<span class='user-wrapper' ng-repeat='" + exp + "'>{{_u}}</span>"+hideShow;
    // modified by kai
  }
  return {
    template:templateFn,
    restrict: 'A',
    link:linkFn,
    scope:true
  }
})
.directive('userName', function() {
  // 将class=userName转换为imDomUser
  function linkFn(element,attrs) {
    if(element.find('input').length>0){
      return;
    }
    element.html("<span im-dom-user>" + element.text() + "</span>");
  }
  return {
    restrict: 'C',
    compile:linkFn
  }
})

.directive('imDomUserInner', function($timeout,$imNotesName,$ionicPopover,$rootScope,ContactService,indiConfig) {
  // domino用户名内部子组件
  function preventClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  function linkFn(scope,element,attrs) {
    var exp = attrs.expression;
    // 传了表达式：计算表达式的值，否则取内容
    var fullname = exp?scope.$eval(exp):element.html();
    var realname = $imNotesName.toRealName(fullname);
    var cnAndOu = $imNotesName.toCnAndOu(fullname);
    element.html(realname);

    if(cnAndOu === realname){
      // 如果打开了所有人显示vcard的开关
      if(indiConfig.modules.contact.showVcardFor()=='all'){
      }else{
        return;
      }
    }
    if(element.parent('.popup').length){
      // alert框内，无法用popover，点击切换用户格式
      var state = false;
      element.on("click",function(event) {
        element.html(state?realname:cnAndOu);
        state = !state;
        preventClick(event);
      });
    }else{
      var popover;

      var clickfunc = function(event) {
        var loadingStr = '<ion-spinner icon="dots"></ion-spinner>'
        var template = '<ion-popover-view class="user-detail"><div class="popover-content">' + loadingStr + '</div></ion-popover-view>';
        if (!popover) {
          popover = $ionicPopover.fromTemplate(template);
          popover.show(event);
             if(fullname.indexOf("/")!==-1){
              ContactService.get($imNotesName.toABBR(fullname)).then(function(data) {
                var dataparam = {}
                var deppath = ''
                var aryDept = data.msg.deppath.main.length == 1 ? data.msg.deppath.main : data.msg.deppath.main.slice(1).reverse()
                aryDept = aryDept.map(function(it, index) {
                  return it.name.indexOf("/") == -1 ? it.name : it.name.substr(0, it.name.indexOf("/"))
                })
                deppath = aryDept.join("/")
                dataparam.results = [cnAndOu, deppath]
                dataparam.userinfo = data.msg
                scope.$emit("$im.contact.vcard.afterGetData", dataparam)
                var newContent = dataparam.results.map(function(elem, index) {
                  return '<span class="vcard-item">' + elem + '</span>';
                })
                newContent = newContent.join("")
                popover.el.querySelectorAll(".popover-content")[0].innerHTML = newContent
                popover._onWindowResize()
              });
            } else{//如果用户名没有斜杠，则移除可点击效果和事件
              element.removeClass("clickable-name")
              popover.el.querySelectorAll(".popover-content")[0].innerHTML = "未找到用户"
              popover._onWindowResize()
              element.off("click", clickfunc)
            }
        } else {
          popover.show(event);
        }
        preventClick(event);
      }
     if(fullname.indexOf("/")!==-1){
          element.on("click",  clickfunc)
   }
      // 及时销毁popover
      scope.$on('$destroy', function() {
         popover && popover.remove();
      });

    }
   if(fullname.indexOf("/")!==-1){
      element.addClass('clickable-name');
   }
    if(element.parent('.item-content-per').length){
       element.parent('.item-content-per').addClass("contact-person-click");
    }
  }
  return {
    restrict: 'E',
    link:linkFn
  }
})
.filter('filterUsrNameNumber',function(){ //
  return function (str){
  str = str || "";
    str = str.replace(/;|\^/g,",");
    var astrName = str.split(",");
    var strResult = "";
    for(var i=0;i<astrName.length;i++){
      var tmpName = astrName[i].replace(/(CN|OU|O|C)=/gi,"");
      strResult += (strResult==""?"":",") + (tmpName.split("/")[0].replace(/\d+$/g,''));
    }
    return strResult;
  }
})
.service('$imWorkschedule',indiplatform.dojoRpcWrapper({
  "serviceURL": "/indishare/rpc.nsf/workschedule.xsp/ws",
  "methods":[
    "difference",
    "getSchedule",
    "getScheduleByContext",
    "getDutyTime",
    "getDutyTimeByContext",
    "differenceBatch",
    "diffByContext",
    "diffByContextBatch"
  ]
})).factory('workscheduleService', function($imWorkschedule) {
  return indiplatform.deprecatedService($imWorkschedule,'workscheduleService','$imWorkschedule');
})
.factory('$imNotesName', function() {
  // 处理Notes用户名格式
  function _toRealName(str) {
    //如果是外网邮件格式,则不进行处理
    if(/\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]/g.test(str)) {
        return str;
    } else {
        return _toCN(str).replace(/\d+/,"") + _extractStatus(str);
    }
  }
  // added by kai, to show the status whether the user has readed or handled the fow.
  function _extractStatus(str) {
    return str.indexOf("【")>-1?str.slice(str.indexOf("【"), str.indexOf("】")+1):"";
  }
  // added by kai
  function _toCN(str) {
    return _toABBR(str).split("/")[0];
  }
  function _toABBR(str) {
    return str.replace(/(CN|OU|O|C)=/gi,"");
  }
  function _toCnAndOu(str) {
    var abbr = _toABBR(str);
    var pos = abbr.lastIndexOf("/");
    return pos===-1?abbr:abbr.substr(0,pos);
  }
  function _toCANONIC(str) {
    var arr = _toABBR(str).split("/");
    return arr.map(function(val,idx,arr) {
      if(idx === 0){
        return "CN=" + val;
      }else if(idx === arr.length-1){
        return "O=" + val;
      }else{
        return "OU=" + val;
      }
    }).join("/");
  }
  function _transDeptName(str){
    var deptPath = angular.fromJson(imLocalStorage.getItem("uinfo")).allPathName
    var fullDep  = deptPath.split("/").reverse();
      if(deptPath.indexOf(str)!==-1)  return str.split("/")[0]
      var  dstDept = str.split("/").reverse()
      for(var i= 0;i<dstDept.length;i++){
          if(i<fullDep.length && dstDept[i]==fullDep[i]){
              dstDept[i] = ""
          }else{
            break;
          }
      }
      dstDept = dstDept.filter(function(item){
        return item!==""
      })
      return dstDept.reverse().join("/")
  }
  function _equals(str1,str2) {
    return _toABBR(str1) === _toABBR(str2);
  }
  return {
    toRealName:_toRealName,
    toCN:_toCN,
    toABBR:_toABBR,
    toCnAndOu:_toCnAndOu,
    toCANONIC:_toCANONIC,
    transDeptName:_transDeptName,
    equals:_equals
  }
})
.config(function($provide) {
  $provide.decorator('$imUrl', function($delegate,CONFIG) {
    var api_root = CONFIG.DOM_ROOT;
    var _old_transform = $delegate.transform;
    $delegate.transform = function(url){
      // 相对路径的nsf库，加上/_api
      if(url.indexOf(".nsf") !== -1 && url.indexOf("/") === 0 && url.indexOf(api_root) !== 0){
        url =  api_root + url;
      }
      url = _old_transform(url);
      // 处理大小写，避免linux操作系统上的错误
      url = url.replace(/indiwscenter\.nsf/ig,"indiWSCenter.nsf");
      return url;
    }
    return $delegate;
  });
})
.directive('selectpeople', function($rootScope,selectService,$q) {
  return {
    restrict: 'A',
    template: function(scope, element, attrs, ctrl) {
      var bindid = element.bindid;
      var isSingle = element.$attr.single;
      var hasScopeuser = element.scopeuser?"yes":"no";//是否可能有选择范围
      var isWyqd = element.$attr.wyqd;
      var depCode = element.deptree;
      var context = element.context;
      var index = element.index;

      $select=angular.element('<i class="icon ion-ios-plus-outline placeholder-icon icopercustom"></i>');
      $element = angular.element(element.$$element.parent());
      $select.attr("ng-click", "selectPeople('"+bindid+"','"+isSingle+"','"+hasScopeuser+"','"+isWyqd+"','"+depCode+"','"+context+"')");
      return $select[0].outerHTML;
    },
    controller:function($scope,$attrs){
      $scope.$watch($attrs.scopeuser,function(newVal){
          if(!newVal) return;
          $scope.scopeuser=newVal;
      })
      $scope.$watch($attrs.single,function(newVal){
          if(!newVal) return;
          $scope.isSingle=newVal;
      })

      $scope.$watch($attrs.deptree,function(newVal){
          if(!newVal) return;
          $scope.subtree=newVal;
      })

      $scope.$watch($attrs.wyqd,function(newVal){
          if(!newVal) return;
          $scope.isWyqd=newVal;
      })

      $scope.$watch($attrs.scoperule,function(newVal){
          if(!newVal) return;
          $scope.scoperule=newVal;
      })

      $scope.selectPeople = function(data,isSingle,hasScopeuser,isWyqd,depCode,context) {
          $scope.bindTo=data;
          $scope.prope={};
          $scope.prope.isSingle=$scope.isSingle;
          $scope.prope.isWyqd = $scope.isWyqd;
          $scope.prope.subtree = $scope.subtree;
          $scope.prope.context =context;

        if(context=="mail"){
          var ispreventdefault=false;
           var deferred = $q.defer()
           var types=  [{'key':'mail.sendto','value':'$scope.formData.sendTo'},{'key':'mail.copyto','value':'$scope.formData.copyTo'},{'key':'mail.blindto','value':'$scope.formData.blindCopyTo'}]
           var  util = {
              typeIsMatch: function(condition) {
                var key = types.filter(function(item){return item.value===data})[0].key
                return  key.indexOf(condition)!==-1
              },
              preventDefault:function(val){
                ispreventdefault = val
              },
              selectedValue : eval(data),
              returnValueDefer:deferred
           }
           var ret = $rootScope.$emit("$im.common.selectPerson.click",util).defaultPrevented
           deferred.promise.then(function(selected){
              eval(data+"=selected")
           })
          if(ret){
            return
          }
         }
          var data = {
            scopeValue:$scope,
            setCustomClass:function(css){
              $scope.prope.customCommentModelCss=css
            }
          }
          if( ["webflow.submit","webflow.huiqian","webflow.notify"].indexOf($scope.prope.context)!==-1){
             $scope.$emit("$im.webflow.selectPeopleModal.beforeShow",data)
          }
          var selecttemplate;
          if(hasScopeuser=='yes' && $scope.scopeuser && $scope.scopeuser.length>0){
              if($scope.prope.subtree ){
                 selecttemplate='app/contact/select.html'
               }else{
                selecttemplate='app/contact/selectscope.html'//指定范围的
               }
          }else{
              selecttemplate='app/contact/select.html'
          }
          //判断选择人员范围 0为不可选
          if($scope.scoperule && $scope.scoperule.type && $scope.scoperule.type[0]==="0"){
            $scope.scopeuser = [];
            selecttemplate='app/contact/selectscope.html'//指定范围的
          }
          selectService.init(selecttemplate,$scope).then(function(modal) {
              modal.show();
          });
      };
    }
  }
})
.directive('selpeo', function($rootScope,selectService,$compile,$filter,$timeout,$ionicScrollDelegate) {
  return {
    restrict: 'A',
    scope: true,
    require:'?ngModel',
    link: function(scope, element, attrs,ngModel) {
       //判断是否显示选择图标属性
       if(attrs.showico) {
         element.after(angular.element('<i class="icon ion-ios-plus-outline placeholder-icon icopercustom"></i>'));
       }
       var showdiv=angular.element('<div style="width:65%" class="selpeo"><div ng-if="p!=\'\'" class="selectedItemcontent"  ng-repeat="p in '+attrs.ngModel +'" ng-click="del('+attrs.ngModel+',\'{{p}}\')"> <label class="selectedinputItem ng-binding">{{p |domUser}}</label><span class="del indi-shanchu"></span></div>'+
          '<span ng-click="hideShow()" ng-if="showPickBtn" class="selectedItemcontent selectItemShowMore"><a ng-show="pickDown">点击展示更多</a><a  ng-hide="pickDown">折叠</a></span>');
       showdiv.addClass("ng-hide");
       element.after(showdiv);
       //element[0].style.display="none" ，用display 不会触发校验 修改为viibility=hidden
       element[0].style.visibility="hidden";
       element[0].style.position="absolute";
       ngModel = ngModel || {
          "$setViewValue" : angular.noop
       }
       $timeout(function(){
        if (angular.isString(ngModel.$modelValue) && ngModel.$modelValue != "") { //统一变成数组格式，兼容repeate显示
          ngModel.$setViewValue(ngModel.$modelValue.replace(/\s/g,"").split(/,|;/))
          ngModel.$render();
        }
        $compile(showdiv)(scope);
        showdiv.removeClass("ng-hide");
        if(ngModel.$modelValue){
          $timeout(function() {
            scope.showHideMore(ngModel.$modelValue.length)
          })
        }
      },50)
      var getItemContainer=function(curElm){
        while(curElm && (!angular.element(curElm).hasClass("item-input")&&!angular.element(curElm).hasClass("item-input-inset") )){
          curElm = curElm.parentNode;
        }
        return curElm;
      }
      angular.element(getItemContainer(element[0])).bind('click', function(e){
          scope.modeCtrl={};
          scope.modeCtrl.value=ngModel.$modelValue
          scope.$apply('selectPeople()').then(function(data){
              if(data.length==0){
                  data="";
              }
              ngModel.$setViewValue(data);
              ngModel.$render();
              $timeout(function(){
                scope.showHideMore(data.length)
              })
          });
      });
    },
    controller:function($scope,$element,$attrs,$q){
      $scope.del = function(names, name) {
        event.stopPropagation();
        names.splice(names.indexOf(name), 1);
        if (names.length == 0) {
          angular.element($element).controller('ngModel').$setViewValue("");
        }
        $timeout(function() {
          $scope.showHideMore(names.length)
        })
      }
      $scope.selectPeople = function() {

        $scope.prope = {};
        $scope.prope.context =$attrs.context;
        var data = {
          scopeValue: $scope,
          setCustomClass: function(css) {
            $scope.prope.customCommentModelCss = css
          }
        }
       if( ["webflow.submit","webflow.huiqian","webflow.notify"].indexOf($scope.prope.context)!==-1){
             $scope.$emit("$im.webflow.selectPeopleModal.beforeShow",data)
          }

        $scope.prope.isSingle = $attrs.selecttype;
        var selecttemplate = 'app/contact/select.html';
        selectService.init(selecttemplate, $scope).then(function(modal) {
          modal.show();
      });
        return $q(function(resolve, reject) {
          $scope.modeCtrl.hide = function() {
            if ($scope.modeCtrl.flag) {
              resolve($scope.modeCtrl.value);
            } else {
              reject($scope.modeCtrl.value);
            }
          }
        })
      };
      $scope.hideShow = function() {
        event.stopPropagation();
        var $ele = $element.next();
        if ($scope.pickDown) {
          //展开
          $scope.pickDown = false;
          $ele.removeClass('hide-more')
        } else {
          $scope.pickDown = true;
          $ele.addClass('hide-more')
        }
        $ionicScrollDelegate.$getByHandle('webflow').resize()
      }
      $scope.showHideMore = function(len) {
        var defalutNum =10,
            $ele = $element.next();
        if (len >= defalutNum) {
          //数量超过折叠数量
          $scope.showPickBtn = true;
          if ($scope.pickDown == undefined) {
            $scope.pickDown = true
          }
          if ($scope.pickDown) {
            //如果现在状态是折叠状态
            $ele.addClass('hide-more')
          } else {
            $ele.removeClass('hide-more')
          }
        } else {
          $ele.removeClass('hide-more')
          $scope.pickDown = undefined
          $scope.showPickBtn = false;
        }
      }
    }
  }
})
.directive('selectdep', function($rootScope,selectService) {
  return {
    restrict: 'A',
    template: function(scope, element, attrs, ctrl) {
      var bindid= element.bindid;
      var treetype= element.treetype;
      var index=element.index;
         $select=angular.element( '<i  class="icon ion-ios-plus-outline placeholder-icon" style="position:absolute;color: rgb(250,120, 0);z-index:100"></i>');
         $element = angular.element(element.$$element.parent());
         $select[0].style["right"]="2%"
         $select[0].style["font-size"]="30px"
         $select[0].style["top"]="8px"
         $select.attr("ng-click", "selectDep('"+bindid+"','"+treetype+"')" );
          return $select[0].outerHTML;
    },
    controller:function($scope){
      $scope.selectDep = function(data,treetype) {
        $scope.bindTo=data;
        var template='app/contact/selectdep.html';
        if(treetype!="" && treetype!="undefined"){
          template='app/contact/selecthqdep.html';
          $scope.treetype=treetype;
        }
        selectService.init(template,$scope).then(function(modal) {
            modal.show();
        });
      };
    }
  }
})
.directive('seldep', function($rootScope,selectService,$compile,$filter,$parse,$timeout) {
  return {
    restrict: 'A',
    scope: true,
    require:'?ngModel',
    link: function(scope, element, attrs,ngModel) {
        // var selicon=angular.element('<i class="icon ion-ios-plus-outline" style="color: rgb(250,120, 0);z-index:100;font-size:30px"></i>');
        // element.after(selicon);
        var showdiv=angular.element('<div style="width:65%" class="selpeo"><div class="selectedItemcontent"  ng-repeat="p in '+attrs.ngModel +' track by $index" ng-click="del('+attrs.ngModel+',\'{{p}}\')"> <label class="selectedinputItem ng-binding">{{p | imDept}}</label><span class="del indi-shanchu"></span></div></div>');
        showdiv.addClass("ng-hide");
        element.after(showdiv);
        element[0].style.display="none"
        ngModel = ngModel || {
            "$setViewValue" : angular.noop
        }
        $timeout(function(){
            if( angular.isString(ngModel.$modelValue) && ngModel.$modelValue!="" ){//统一变成数组格式，兼容repeate显示
                      ngModel.$setViewValue(ngModel.$modelValue.replace(/ /g,'').split(/;|,/));
                      ngModel.$render();
                      if(attrs.code){
                          $parse(attrs.code).assign(scope, scope.$eval(attrs.code).replace(/ /g,'').split(/;|,/));
                      }
            }
            $compile(showdiv)(scope);
            showdiv.removeClass("ng-hide");
        },50)
        var getItemContainer=function(curElm){
          while(curElm && (!angular.element(curElm).hasClass("item-input")&&!angular.element(curElm).hasClass("item-input-inset") )){
            curElm = curElm.parentNode;
          }
          return curElm;
        }
        angular.element(getItemContainer(element[0])).bind('click', function(e){
            scope.modeCtrl={};
            scope.modeCtrl.value=ngModel.$modelValue;
            if(attrs.code){scope.modeCtrl.valueCode=scope.$eval(attrs.code);}
            scope.$apply('selectDep()').then(function(data){
                  ngModel.$setViewValue(data.depname);
                  ngModel.$render();
                  if(attrs.code){$parse(attrs.code).assign(scope, data.depcode);}
            });
        });
    },
    controller:function($scope,$attrs,$q,$parse){
      $scope.del=function(array,name){
         event.stopPropagation();
          var index=array.indexOf(name);
          array.splice(index,1);
          if($attrs.code){$scope.$eval($attrs.code).splice(index,1)}
      }
      $scope.selectDep = function() {
          $scope.prope={};
          $scope.prope.isSingle=$attrs.selecttype;
          var selecttemplate='app/contact/selectdep.html';;
          selectService.init(selecttemplate,$scope).then(function(modal) {
              modal.show();
          });
          return $q(function(resolve, reject) {
                      $scope.modeCtrl.hide=function(){
                              if ($scope.modeCtrl.flag) {
                                resolve({'depname':$scope.modeCtrl.value,'depcode':$scope.modeCtrl.valueCode});
                              } else {
                                reject($scope.modeCtrl.value);
                              }
                      }
          })
      };
    }
  }
})
// 增加pad标识
window.isPad = window.matchMedia('(min-width:1000px)').matches;
