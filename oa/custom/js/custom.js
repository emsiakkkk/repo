indiplatform.loadResources(["app-duban/duban.js"])
 //决议督办
angular.module('indiplatform.custom', ['duban'])
.config(function(indiConfigProvider){
	indiConfigProvider.modules.mail.disable(true); // 禁用邮件
	indiConfigProvider.modules.workspace.enableHomepage(true);	//开启首页九宫格
	indiConfigProvider.modules.webflow.enableQRCode(true);
	indiConfigProvider.modules.webflow.submit.doubleCheckWhenNoOptionFlowSubmit(false);
	indiConfigProvider.modules.startProcess.disable(true);//开启移动起草
	//4-27 添加移动端安卓系统角标功能
	indiConfigProvider.display.showAndroidBadge(true);
})

.config(function($imTranslateProvider) {
	$imTranslateProvider.translations('zh_CN', {
		"im.page_title.home":"广东广电网络",//替换首页标题文字
		"im.webflow.tab_title.form":"呈批表"//表单替换
  });
})

.config(function(indiConfigProvider){
    indiConfigProvider.display.dateTime.disableCalendarFormat(true);//时间显示标准格式
})

.run(function(indiConfig, $rootScope, $imUserInfo, $imLog, $q,$imCrypto,$http) {    
	$rootScope.$on("$im.workspace.homepage.loaded", function(evt, moduleUtil) {
		//删除废件
		moduleUtil.remove('trash');
		//删除草稿
		moduleUtil.remove('caogao');
		//改变位置，调整顺序
		moduleUtil.changeOrder('newstype0',1);
		moduleUtil.changeOrder('newstype1',2);
		moduleUtil.changeOrder('newstype2',3);
		
		
		var module = {        
			moduleName: "决议督办",        
			order: 100,        
			position: "down",        
			type: "category"      
		}      
		moduleUtil.addModule(module);   
		var duban_rwzx = {moduleName:"任务中心",class:"indi-buqin icon",url:"/dmission",order:100,flag:"dmission",position:'down'}
		moduleUtil.addModule(duban_rwzx);
		var duban_dbgl = {moduleName:"督办管理",class:"indi-tongxunlu1 icon",url:"/dproject",order:101,flag:"dproject",position:'down'}
		moduleUtil.addModule(duban_dbgl);
		var duban_dbtx = {moduleName:"督办提醒",class:"indi-wodejilu icon",url:"/tixing",order:102,flag:"tixing",position:'down'}
		moduleUtil.addModule(duban_dbtx);
		var duban_dbcx = {moduleName:"督办查询",class:"indi-sousuo icon",url:"/dsearch",order:103,flag:"dsearch",position:'down'}
		moduleUtil.addModule(duban_dbcx);
		
	})
})

.run(function($imValidator,$q,indiConfig,$imFormDelegate,$rootScope,$location,$imUserInfo,$imUrl,$http,$ionicLoading,$ionicPopup,$ionicModal,$timeout,$imTimedInfo,$ionicPopup,$window,$location){
    
	//添加水印方法(可以根据具体需求对样式、内容进行调整)
    var canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 120;
    // get the context
    var ctx = canvas.getContext("2d");
    //设置字体
    ctx.font = '18px serif';
    //设置倾斜角度
    ctx.rotate(Math.PI/8);
    var styleEl = document.createElement('style'),styleSheet;
    document.head.appendChild(styleEl);
    styleSheet = styleEl.sheet;
    //读取当前用户信息
    $rootScope.$on("$im.common.userinfo.afterGetData",function(evt,res) {
		//CN=王崴/O=gcable
		var uname = res.fullname.replace("CN=",'');
		uname = uname.replace("/O=gcable",'');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillText(uname+"("+res.userid+")", 20, 30);
		var dataURL = canvas.toDataURL();
		if(styleSheet.cssRules.length > 0) styleSheet.deleteRule(0);
		var cssstr = 'content:"";top:0px;pointer-events:none;bottom:0px;left:0px;right:0px;position:absolute;opacity:0.1;background-image:url(' + dataURL + ')';
		//附件添加水印
		styleSheet.insertRule('.attach-content-img:after,.attach-content-reflow:after{'+cssstr+'}',0);
		//表单添加水印,设置图层优先级为1000
		styleSheet.insertRule('.webflow-wrap:after{z-index:1000;'+cssstr+'',0);
    })
	//添加水印方法结束
	
	//当点击未读状态的数据时之间将状态改为已读状态，不用请求服务器
	$rootScope.$on("$im.workspace.newsitem.beforeRender", function (evt, param) {
		//只有发布类列表才增加标识
		if(!evt.currentScope.$state.current.navId || evt.currentScope.$state.current.navId.indexOf("newstype") == -1){
			return 
		}
        if ( param.data.fbdocisreadbycurpsn_yy == "0") { 
			param.onClick(function(evt1) {
				param.data.fbdocisreadbycurpsn_yy = "1";
			},true);
        }
    });
})

.run(function ($rootScope,$location,$imUrl) {
	$rootScope.$on('$im.webflow.yjField.beforeShow', function(evt,data) {
		var newValfmt = data.fldJsonValue? data.fldJsonValue :[];
		if(data.fldJsonValue != undefined){
			data.setRenderFn(function(yj){
				//项目重画意见
				var host = $imUrl.getHost($location.$$path.split("/")[2],"");
         
				if (newValfmt && newValfmt.length > 0) {
					var yjhtml = '';
					newValfmt.forEach(function (item, index) {
						item.spyj = item.spyj?item.spyj.replace(/</g,"&lt;").replace(/>/g,'&gt;').replace(/&lt;br&gt;/g,"<br/>"):"";
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
								yjhtml = yjhtml + '<tr class="yjAttAndPic"><td><div ><p ng-repeat="att in  [yjatt['+index+']] " class="att" im-att-view="att"></p></div>'
         
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
								item.signtmpl = item.signtmpl.replace(/\{time=([^}]+)\}/, '<br>'+item.timefmt);
							}
							if(item.wtfromuser){
								item.signtmpl=item.signtmpl.replace(/{wtuser}/ig,'<span im-dom-user>'+item.wtfromuser +'</span>');
								item.signtmpl=item.signtmpl.replace(/{wtinfo=/ig,'');
								item.signtmpl=item.signtmpl.replace(/}/ig,'');
							}else{
								item.signtmpl=item.signtmpl.replace(/\{wtinfo=([^}]+)\}/,'');
								item.signtmpl=item.signtmpl.replace(/\)}/,'');
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
					return yjhtml;
				}  
			});
		}
    });
})

//修改公告标题
.directive('itemTextWrap',function(){
	function templateFn(element, attr){
		return element.html().replace("{{new.newtitle}}","<span ng-class=\"{'yd_xm': new.fbdocisreadbycurpsn_yy=='1', 'wd_xm': new.fbdocisreadbycurpsn_yy!='1'}\">{{new.fbdocisreadbycurpsn_yy=='1'?'已读':'未读'}}</span>{{new.newtitle}}")
	}
	return {
		scope:false,
		template:templateFn,
		restrict: 'C'
	}
})
