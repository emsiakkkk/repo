angular.module('indiplatform.webflow.controllers', [])
  .controller('WebflowCtrl', function ($rootScope, $injector, $location, $scope, $imWebflowDelegate, $q, $imPhotoPicker, $state, myinfoService, $stateParams, $filter, $timeout, $ionicPopup, $ionicLoading, $ionicModal, $ionicActionSheet, $ionicScrollDelegate, $ionicSlideBoxDelegate, DocService, FormDataService, NodeInfoService, CyyService, selectService, ContactService, $ionicHistory, $imFormDelegate, $imHistory, $imTimedInfo, indiConfig, $imNotesName, $imUrl, $imUserInfo, ngProgressFactory, $imMorebtnOuter, $ionicPopover, $sce, $imAtt, $ionicTabsDelegate, $imFilePicker) {
    $scope.hasHAinfo = false
    $scope.iseidt = false
    $scope.eidtpath = '';
    $scope.depp = []; //用户所属部门路径
    $scope.enableVoice = indiConfig.modules.webflow.enableVoiceComment();
    $scope.submittitle = "提交";
    $scope.submitBtnTitle = "提交" //默认提交按钮为提交，如果是顺序审批，不是最后一个审批人时需显示下一个审批人
    if (typeof ($scope.context.userinfo.depFullname) != "undefined") {
      $scope.depMain = $scope.context.userinfo.depFullname;
      $scope.depp.unshift($scope.depMain);
    }
    if ($scope.context.userinfo.fldSubDepsInfo.toString() != "" && typeof ($scope.context.userinfo.fldSubDepsInfo) != "undefined") {
      $scope.Other = JSON.parse($scope.context.userinfo.fldSubDepsInfo);
      for (x in $scope.Other) {
        angular.forEach($scope.Other[x], function (i) {
          $scope.depp.unshift(i.SubDep);
        })
      }
    }
    $scope.depp = $filter('unique')($scope.depp);
    var defer = $q.defer()
    var setCheckBrank;
    var webflowInstance = {
      triggerActionBtn: function (id) {
        if (!$scope.realBtnsinit) {
          $scope.realBtns = getRealBtns();
          $scope.realBtnsinit = true;
        }
        _buttonClicked("", id)
      },
      getCurrentState: function () {

        return defer.promise
      },
      getAttachData: function () {
        return $scope.formData.idxfiles
      },
      getRequiredField: function () {
        return $scope.formData.power.needField ? $scope.formData.power.needField : [""]
      }
    };
    var deregisterInstance = $imWebflowDelegate._registerInstance(
      webflowInstance, "webflowidx",
      function (instance) {
        // 再次打开新的webflow页面，$destroy晚于_registerInstance执行，强制使用最后一个实例;
        var instances = $imWebflowDelegate._instances;
        return instance === instances[instances.length - 1]
      }
    );
    $scope.$on('$destroy', function () {
      deregisterInstance()
    });
    $scope.fileinfo = {
      protocol: $stateParams.protocol,
      domain: $stateParams.domain,
      dbpath: $stateParams.path,
      unid: $stateParams.id,
      ass: $stateParams.ass
    };
    //扩展区域对象
    $scope.tabsInfo = {
      //流程信息
      flowinfo: {},
      //意见
      yijian: {},
      //会签来源意见
      srcyijian: {},
      //正文
      mainFile: {},
      //editor正文
      editorBody: {},
      //附件
      attach: {},
      //文件,合并后的附件正文
      files: {},
      //关联文档
      relatedDocs: {},
      //知会
      notify: {},
      //提醒
      remind: {}
    };
    //加载扩展组件方法,将传入的标识加入scope中作为页签隐藏条件
    $scope.fnIsInitParam = function (val) {
      if (val) {
        $scope[val] = true;
      }
      //判断是否订使用了意见订制区,如果是则加载意见中的用户头像及审批级别
      if (val === "yijianTabHide" && $scope.yjs) {
        //获取人员头像
        $scope.getAvatars && $scope.getAvatars($scope.yjs);
        //获取审批级别
        $scope.getShenPiJb && $scope.getShenPiJb();
      }
      //判断是否订使用了会签来源意见,如果是则加载
      if (val === "srcyijianTabHide") {
        $scope.showYjList && $scope.showYjList(2);
      }
    }
    $scope.form = {};
    $scope.form.custom_fileds = {};
    $scope.actionType = "submit";
    FormDataService.getmanagerset($scope.fileinfo).then(function (data) {
      $scope.managerset = data;
    });

    //获取表单数据
    $scope.getFormData = function () {
      FormDataService.get($scope.fileinfo).then(function (FormData) {
        // code inserted by kai
        // add a action button named "已阅"
        for (let btn of FormData.ActionBtns.values()) {
          if (btn.id == "zhihuibanbi") {
            FormData.ActionBtns = FormData.ActionBtns.concat({id: "zhijieyiyue", iscy: "1", label: "已阅"});
            break;
          }
        }
        // code inserted by kai
        //判断是否为顺序审批
        if (FormData.FlowBtns && FormData.FlowBtns.returnSence == 'SubmitBtn_sence1') {
          var currentFlowInfo = FormData.CurInfo[0];
          var currentDealer = currentFlowInfo.user,
            allDealer = currentFlowInfo.alldealer.split(','),
            allDealerName = [];
          angular.forEach(allDealer, function (item, index, arr) {
            allDealerName.push($imNotesName.toCN(item));
          })
          if (currentFlowInfo.flownum != '0' && allDealerName.length > 1) {
            $scope.submitBtnTitle = '提交给' + allDealerName[1]
          }
        }
        //判断是否进入表单时加载知会记录
        if (indiConfig.modules.webflow.zhiHuiInfoInit()) {
          $scope.getZhiHuiJiLu();
        } else {
          //是否记录加载标识
          $scope.zhjiluload = false;
        }
        if (FormData.type == "fail") {
          $rootScope.refreshdy = ""
          defer.reject("")
          var errMsg = FormData.msg
          if (FormData.errordump && FormData.errordump[0] && FormData.errordump[0].msg) {
            if (FormData.errordump[0].flowerrorcode == '999') $stateParams.nodoc = true
            errMsg = FormData.errordump[0].msg
          }
          $ionicPopup.alert({
            template: errMsg
          }).then(function () {
            $imHistory.backToList();
          })
          return
        }
        $scope.MultiText = FormData.attconfig && FormData.attconfig[0] && FormData.attconfig[0].extpara.indexOf("MultiText=true") != -1
        $scope.title = FormData.form.subject ? FormData.form.subject[0] : $location.search()['title']
        $scope.mtype = FormData.form.type ? FormData.form.type[0] : $location.search()['type']
        $scope.isflow = FormData.isflow
        $scope.isBohui = FormData.ActionBtns.filter(function (item) {
          return item.id === "bohui"
        }).length > 0
        var confhqlz = indiConfig.modules.webflow.huiqianShowMaindocFlowinfo();
        if (confhqlz) {
          if (FormData.form.formdb && FormData.form.formdocunid && FormData.form.formdns) {
            $scope.hqfrominfo = {
              domain: FormData.form.formdns,
              dbpath: "/" + FormData.form.formdb,
              unid: FormData.form.formdocunid,
              ass: undefined
            };
            FormDataService.getflowinfo($scope.hqfrominfo).then(function (FormDataMain) {
              FormData.lzListMain = FormDataMain.LzList
              FormData.lzList = FormDataMain.LzList
              $scope.lzs = FormDataMain.LzList;
              $scope.lzs.forEach(function (item) {
                item.subitem && !angular.isArray(item.subitem) ? item.subitem = [item.subitem] : ""
              })
            })
          }
        }
        if (FormData.form.power && FormData.form.power.withmobile == true) { //是否可编辑
          $scope.iseidt = true;
          //是否为关联文档
          var isAssFlag = ($scope.fileinfo.ass == "true");
          //判断是否为会签或者关联文档,如果为关联文档则使用高权限表单打开
          if ($stateParams.path.indexOf("hqgl_") != -1) {
            $scope.editpath = $imUrl.getHost(FormData.form.formdns, $stateParams.protocol) + "/" + FormData.form.formdb + '/frmwebflow-mobile-hq?readform&unid=' + FormData.form.formdocunid + '&subform=' + FormData.form.subform[0]
            $scope.editpath = $imUrl.transform($scope.editpath)
          } else if (isAssFlag) {
            $scope.editpath = $imUrl.getHost($stateParams.domain, $stateParams.protocol) + $stateParams.path + '/frmwebflow-mobile-hq?readform&unid=' + $stateParams.id + '&subform=' + FormData.form.subform[0];
            $scope.editpath = $imUrl.transform($scope.editpath)
          } else {
            if ($scope.isflow) { //走流程时
              var indealer = false
              angular.forEach(FormData.CurInfo, function (it) {
                if ($imNotesName.toABBR(it.alldealer).indexOf($imNotesName.toABBR($scope.context.userinfo.fullname)) !== -1) {
                  indealer = true
                }
              })

              if (FormData.form.power.editable[0] != 'no' && indealer && FormData.form.istrash != 'yes') {
                $scope.editpath = $imUrl.getHost($stateParams.domain, $stateParams.protocol) + $stateParams.path + '/vwsetform/' + $stateParams.id + "?editdocument&form=frmwebflow-mobile"
              } else {
                $scope.editpath = $imUrl.getHost($stateParams.domain, $stateParams.protocol) + $stateParams.path + '/vwsetform/' + $stateParams.id + "?open&form=frmwebflow-mobile"
              }
            } else {
              if (FormData.form.power.editable[0] == 'yes' && FormData.form.istrash != 'yes') {
                $scope.editpath = $imUrl.getHost($stateParams.domain, $stateParams.protocol) + $stateParams.path + '/vwsetform/' + $stateParams.id + "?editdocument&form=frmwebflow-mobile"
              } else {
                $scope.editpath = $imUrl.getHost($stateParams.domain, $stateParams.protocol) + $stateParams.path + '/vwsetform/' + $stateParams.id + "?open&form=frmwebflow-mobile"
              }
            }

            $scope.editpath = $imUrl.transform($scope.editpath)
          }
          // html缓存在本地时，默认不允许include远程的模板
          $scope.editpathTrusted = $sce.trustAsResourceUrl($scope.editpath);
        }
        if (FormData.CurInfo[0].stat == "待接收") {
          $ionicPopup.alert({
            template: "公文未接收，请在pc端进行收文操作之后再查看"
          }).then(function () {
            $imHistory.backToList();
          })
        }
        if (FormData.CurInfo[0].flownum === '0') {
          $scope.isCreate = true
        };
        var quickmode = indiConfig.modules.webflow.enablePassOrDenyMode()
        var showComment = indiConfig.modules.webflow.passOrDenyMode.showCommentModal()
        $scope.agreebtns = quickmode && !$scope.isCreate;
        $scope.openyjafterquicksubmit = quickmode && showComment ? "1" : "0"

        var host = $imUrl.getHost($stateParams.domain, $stateParams.protocol);
        //拷贝对象前遍历附件,为附件地址添加域名
        angular.forEach(FormData.form.idxfiles, function (item, index) {
          item.url = host + item.url;
        });
        $scope.formData = angular.copy(FormData.form);
        $scope.form.flowconfig = $scope.formData.flowconfig; //系统设置信息
        $scope.form.flowformdeal = $scope.formData.flowformdeal; //系统设置信息

        if ($scope.formData.attitude) {
          $scope.form.comments = $scope.formData.attitude;
        }
        if (imLocalStorage.getItem('comments' + $stateParams.id)) {
          $scope.form.comments = imLocalStorage.getItem('comments' + $stateParams.id)
        }
        $scope.form.flowunid = FormData.FlowBtns ? FormData.FlowBtns.flowunid : "";
        angular.forEach($scope.formData.formdetail, function (item) {
          if (item.type == "user" || (item.fieldtype && ~item.fieldtype.toString().indexOf("fieldYj"))) {
            item.isyj = true;
          }
          try {
            if (item.value[0].indexOf && (~item.value[0].indexOf("yjAttAndPic")) || (~item.value[0].indexOf("class=\"userName\""))) {
              item.isyj = true;
            }
          } catch (e) {}
          if (item.id == "body") {
            $scope.formData.body = item.value;
          }
          if (angular.isArray(item.value)) {
            item.value = item.value.map(function (i) { //过滤表单部门
              angular.forEach($scope.depp, function (j) {
                if (i.toString().indexOf(j) != -1) {
                  j = "/" + j
                  i = i.replace(j, "")
                }
              })
              return i
            })
          }
          if (item.fieldmbset) { //将是|1，否|0转成显示的字
            var fieldmbsetObj = {};
            if (item.value[0].length == 0) { //将是|1，否|""转成是|1，否|0  如加班管理
              item.fieldmbset = item.fieldmbset.replace(/\"{2}/, "0");
              item.value[0] = "0";
            }
            angular.forEach(item.fieldmbset.split(","), function (item) {
              fieldmbsetObj[item.split("|")[1]] = item.split("|")[0]
            })
            item.value = item.value.map(function (value) {
              return fieldmbsetObj[value];
            })
          }
          item.value = item.value.map(function (value) {
            if (typeof (value) == "string") {
              value = $filter('escape2Html')(value); //过滤特殊字符
              //value= $filter('removeEnter')(value);//过滤回车符
            }
            return value
          })
          if (item.dync) {
            item.dync = item.dync.replace(/\r|\n/ig, "");
            try {
              item.dync = JSON.parse(item.dync);
              item.value = JSON.parse(item.value);
            } catch (e) {
              //console.error("动态表格数据异常,转换JSON失败");
            }
          }
          if (item.type) {
            if (item.type == "user") {
              item.value = $filter('unique')(item.value);
              //    item.value = $filter('domUser')(item.value);
            } else if (item.type == "date") {
              item.value = item.value.join("") && moment(item.value.join(""), "YYYY-MM-DD HH:mm:ss Z").format("YYYY-MM-DD") || item.value;
              if (item.value == "Invalid date") {
                item.value = item.value
              }
            } else if (item.type == "datetime") {
              item.value = item.value.join("") && moment(item.value.join(""), "YYYY-MM-DD HH:mm:ss Z").format("YYYY-MM-DD HH:mm:ss") || item.value;
              if (item.value == "Invalid date") {
                item.value = item.value
              }
            }
          }
        });

        $scope.fjlength = 0; //附件个数的
        var isAttitude = /\d*_Attitude\.(gif|png)/i;
        $scope.mergeAttachTab = indiConfig.modules.webflow.mergeAttachTab();
        $scope.formData.idxfiles = $scope.formData.idxfiles.filter(function (idx) { //过滤掉系统归档生成的pdf
          return !idx.createuser.indexOf("系统自动创建") >= 0 && !/主表单[0-9a-fA-F]{32}.pdf/.test(idx.name)
        })

        function getIdxPower(item, power) {
          var powerObj = {
            "_rename": false,
            "_delete": false
          };
          //rename 功能暂时先不做
          if (power.editable[0] == "yes") {
            if (power.idxDelMyself == "yes") {
              if ($imNotesName.toCN(item.createuser) === $imNotesName.toCN($scope.context.userinfo.fullname)) {
                powerObj["_delete"] = true
              }
            } else {
              if (power.hfldIfCanDelIdx == "yes") {
                powerObj["_delete"] = true
              }
            }

          }
          return powerObj;
        }
        //遍历附件,并添加属性
        angular.forEach($scope.formData.idxfiles, function (item, index) {
          //记录附件在列表中的坐标(解压后会使用此值)
          item.idx = index;
          item.businesstype = item.businesstype == "" || !item.businesstype ? "default" : item.businesstype;
          item.filetype = item.businesstype; //文档的属性是filetype，方便处理将ws返回的值也改成filetype
          item.size = $filter('bytes')(item.size);
          if (item.catnum == "-1") {
            $scope.zwurl = item.url;
          }
          item.power = getIdxPower(item, $scope.formData.power)
        });

        $scope.hasDefaultFile = $scope.formData.idxfiles.some(function (idx) {
          return idx.filetype == "default" && idx.catnum != "-1"
        })
        var context = {
          subform: $scope.formData.subform[0],
          dbpath: $scope.fileinfo.dbpath,
          fldTypeId: $scope.formData.typeid[0],
          fldtype: $scope.formData.type[0]
        }
        // 发布获取意见列表的事件，在此可以对列表进行排序、过滤
        $scope.$emit("$im.webflow.yijianList.afterGetData", FormData.YjList, context);
        $scope.srcYjList = "";
        $scope.showYjList = function (value) {
          if (value == 1) { //本文档意见
            dealyj(FormData.YjList, "yjs")
          } else { //会签来源文档意见
            if ($scope.srcYjList) {
              dealyj($scope.srcYjList, "srcyjs")
            } else {
              FormDataService.getflowinfoForMobile({
                protocol: $scope.fileinfo.protocol,
                domain: FormData.form.formdns,
                dbpath: "/" + FormData.form.formdb,
                unid: FormData.form.formdocunid
              }).then(function (data) {
                $scope.srcYjList = data.YjList
                dealyj($scope.srcYjList, "srcyjs")
              })
            }
          }
        }
        $scope.showYjList(1);

        function dealyj(yjs, yjtpname) {
          //判断是否传入了意见类别(会签来源意见使用srcyjs)
          $scope[yjtpname] = yjs;
          $scope.idxfiles = FormData.form.idxfiles;
          $scope.showyjfilter = false;
          $scope[yjtpname].forEach(function (yj) {
            if (yj.shenpijibie && yj.shenpijibie !== "1") $scope.showyjfilter = true;
            if (yj.wtfromuser && yj.wtfromuser != "" && yj.yj.indexOf("（代") == -1) yj.yj = yj.yj + "（代 " + yj.wtfromuser.split('/')[0] + "）"
            if (yj.abfromuser && yj.abfromuser != "" && yj.yj.indexOf("（代") == -1) yj.yj = yj.yj + "（代 " + yj.abfromuser.split('/')[0] + "）"
            if (yj.yjatt) {
              if(yj.yjatt.constructor.name=="Array"){//意见多个附件
                yj.yjatt.forEach(function(ayj){
                  var yjatt = FormData.form.idxfiles.filter(function (item) {
                    return item.name && ayj.attname == item.name
                  })[0];
                  ayj = angular.extend(ayj, yjatt)
                })
              }
              if(yj.yjatt.constructor.name=="Object"){
                var yjatt = FormData.form.idxfiles.filter(function (item) {
                  return item.name && yj.yjatt.attname == item.name
                })[0];
                yj.yjatt = [angular.extend(yj.yjatt, yjatt)]
              }
            }

            if (yj.subhqfk && yj.subhqfk.length) {
              yj.subhqfk.forEach(function (hqfk) {
                if (hqfk.yjatt) {
                  var hqfkatt = FormData.form.idxfiles.filter(function (item) {
                    //从附件列表里取附件信息
                    return item.name && hqfk.yjatt.attname.split("-").slice(-1)[0] == item.name.split("-").slice(-1)[0]
                  })[0];
                  if(hqfkatt){
                    hqfk.yjatt = angular.extend(hqfk.yjatt, hqfkatt)
                    hqfk.yjatt.name = hqfk.yjatt.attname
                  }
                }
              })
            }
            yj.showSubHq = function (yj) {
              if (yj.subhqfk && yj.subhqfk.length > 1) {
                var yjScope = $scope.$new();
                yjScope.yj = yj;
                var template = '<ion-modal-view ><ion-header-bar class="bar bar-header bar-positive">' +
                  '<button class="button button-clear icon indi-fanhui" ng-click="ok()" ></button>' +
                  '<h1 class="title"><span im-dom-user="::yj.fkdep.__text"></span>会签意见</h1>' +
                  '</ion-header-bar>' +
                  '<ion-content >' +
                  '<div class="yjlist">' +
                  '<div class="yjitem" ng-repeat="myj in yj.subhqfk track by $index" >' +
                  '<div class="user">' +
                  '<img ng-src="{{myj.contact.avatar}}">' +
                  '<p><span im-dom-user="::myj.user"></span></p>' +
                  '</div>' +
                  '<div class="yjitem-right">' +
                  '<div class="content">' +
                  '<div class="yj-text"  ng-hide="myj.yj == \'NoAttitude_Handler\'&&(!!myj.yjtp||!!myj.yjatt)" yj-show="myj"></div>' +
                  '<img ng-if="!!myj.yjtp" ng-src="{{myj.yjtp}}"/>' +
                  '<div ng-if="!!myj.yjatt" class="att" im-att-view="myj.yjatt"><i class="icon"></i></div>' +
                  '</div>' +
                  '<div class="time">{{myj.time | imCalendar}}&nbsp;&nbsp;{{myj.stat}}' +
                  '<i class="client-tip icon indi-shouji" ng-if=":: myj.clienttype==\'移动办公专业版\'"></i>' +
                  '</div>' +
                  '</div>' +
                  '</div>' +
                  '</div>' +
                  '</ion-content>' +
                  '</ion-modal-view>'
                var submodal = $ionicModal.fromTemplate(template, {
                  scope: yjScope
                })
                submodal.show();
                yjScope.ok = function () {
                  submodal.hide();
                  submodal.remove();
                }
              }
            }
          });
          $scope.getAvatars && $scope.getAvatars($scope[yjtpname]);
          if (yjtpname === "yjs") {
            //扩展意见页签使用
            $scope.tabsInfo.yijian = {
              count: $scope[yjtpname].length,
              enable: true
            }
          }
          if (yjtpname === "srcyjs") {
            //扩展会签来源意见页签使用
            $scope.tabsInfo.srcyijian.count = $scope[yjtpname].length;
          }
        }

        $scope.form.depHKYJs = angular.copy(FormData.YjList);
        $scope.form.depHKYJs.forEach(function (item, index) {
          item.yjindex = index + 1
          item.selected = false;
          item.toform = false;
        })
        var curYjinfo = {
          id: 'currentHKYJ',
          clienttype: "移动办公专业版",
          user: $scope.context.userinfo.fullname,
          stat: FormData.CurInfo[0].stat,
          flownum: FormData.CurInfo[0].flownum,
          yjindex: FormData.YjList.length + 1,
          time: moment(new Date()).format("YYYY-MM-DD hh:mm:ss"),
          selected: false,
          toform: false
        }
        $scope.form.depHKYJs.push(curYjinfo);
        var hasCurYj = $scope.form.depHKYJs.some(function (item) {
          return item.id === "currentHKYJ"
        })
        if (!hasCurYj) $scope.form.depHKYJs.push(curYjinfo);
        $scope.form.seletFKYJ = []
        $scope.form.seletYJTBD = []
        $scope.form.arySelectAttFileName = []
        $scope.form.arySelectAttitudeFileName = []
        //意见附件数
        $scope.form.yjfilelength=$scope.idxfiles.filter(function(item){
          return item.catnum == -5
        }).length
        var depHQYJs = $scope.form.depHKYJs;
        var data = {};
        data.selectable = true;
        data.setDataProcessFn = function (fn) {
          $scope.form.depHKYJs = fn(depHQYJs)
        }
        if (FormData.form.formdb && FormData.form.formdocunid && FormData.form.formdns) {
          data.hqfrominfo = {
            domain: FormData.form.formdns,
            dbpath: FormData.form.formdb,
            unid: FormData.form.formdocunid
          };
        }
        data.hqcurinfo = {
          subform: FormData.form.subform[0],
          fldTypeId: FormData.form.typeid[0],
          fldtype: FormData.form.type[0],
        };
        $rootScope.$emit("$im.webflow.depHQYJFQ.afterGetData", data);
        $scope.showSelectBox = data.selectable;
        $scope.form.depHKYJs.forEach(function (item) {
          if (item.selected) {
            $scope.form.seletFKYJ.push(item.yjindex);
          }
          if (item.toform) {
            $scope.form.seletYJTBD.push(item.yjindex);
          }
        })
        $scope.yjfilter.yjs = $scope.yjs
        $scope.formData.idxfiles = $scope.formData.idxfiles.filter(function (item) {
          return item.name && !isAttitude.test(item.name) && item.catnum != -5 && item.catnum != -3 && item.catnum != -4
        });

        $scope.fjlength = $scope.formData.idxfiles.filter(function (item) {
          return item.tmpflag != 1 && item.catnum != -1 && !item.ziptype
        }).length + $scope.formData.ftpfiles.length;

        $scope.updateZhengwen = function () {
          $scope.hasYjFileinfo = false;
          $scope.zhengwen = [];
          angular.forEach($scope.formData.idxfiles, function (item) {
            if (item.catnum == -1) {
              $scope.zhengwen.push(item);
            }
            if (item.tmpflag == 1) {
              $scope.hasYjFileinfo = true;
            }
          })
        }
        $scope.updateZhengwen()
        angular.forEach($scope.formData.ftpfiles, function (item) {
          item.superBigAtt = true;
        })
        $scope.$watch('formData.idxfiles.length', function (newVal, oldVal) {
          $scope.fjlength = $scope.formData.idxfiles.filter(function (item) {
            //ziptype 过滤掉解压后的文件分类对象
            return item.catnum != -1 && !item.ziptype && item.tmpflag != 1
          }).length + $scope.formData.ftpfiles.length;
          
          $scope.updateZhengwen()
        })
        //会签来源意见
        $scope.tabsInfo.srcyijian.enable = !($scope.form.flowconfig && $scope.form.flowconfig.key_showHQSrcYJ != '1' || !$scope.formData.formdns);
        //正文
        $scope.canAddMainFile = $scope.formData.power.idxNew == 'yes' && $scope.formData.power.editable[0] == 'yes' && $scope.managerset.zwlx == "2" && $scope.managerset.zw == "1" && !$scope.zhengwen.length
        $scope.tabsInfo.mainFile = {
          count: $scope.zhengwen.length,
          enable: !!$scope.zhengwen.length || $scope.canAddMainFile
        }
        //editor正文
        $scope.tabsInfo.editorBody = {
          count: $scope.zhengwen.length,
          enable: !(!$scope.formData.body || $scope.formData.body[0] == '')
        }
        //附件
        $scope.tabsInfo.attach = {
          count: $scope.fjlength,
          //enable:!((!!$scope.fjlength==0 && $scope.formData.power.idxNew!=='yes') || $scope.mergeAttachTab)
          enable: !((!!$scope.fjlength == 0 && $scope.formData.power.idxNew !== 'yes'))
        }
        //文件
        $scope.tabsInfo.files = {
          count: ($scope.fjlength + $scope.zhengwen.length),
          //enable:!(($scope.fjlength+$scope.zhengwen.length==0&&($scope.formData.power.editable[0]!=='yes'||$scope.formData.power.idxNew!=='yes'))||!$scope.mergeAttachTab)
          enable: !(($scope.fjlength + $scope.zhengwen.length == 0 && ($scope.formData.power.editable[0] !== 'yes' || $scope.formData.power.idxNew !== 'yes')))
        }
        //关联文件
        $scope.tabsInfo.relatedDocs = {
          count: $scope.formData.assFiles.length,
          enable: ($scope.formData.assFiles.length !== 0)
        }
        //是否启用意见附件功能开关
        $scope.enableFileComment = indiConfig.modules.webflow.enableFileComment();
        //选择意见附件功能
        $scope.selYjFiles = function ($event) {
          //判断是否上传了意见附件
          if ($scope.hasYjFileinfo) {
            //如果弹出框存在则不重复创建
            if ($scope.yjPopover) {
              $scope.yjPopover.show($event);
              return;
            }
            //判断是否为Pad
            var htmlTmpStr = '<ion-popover-view' + ($scope.$indimobile.$isPad ? "" : " class='yjPopoverVw'") + '>' +
              '<ion-content><div>' +
              '<p ng-repeat="file in formData.idxfiles" ng-if="file.tmpflag==1" im-att-view="file"></p>' +
              '</div></ion-content>' +
              '</ion-popover-view>';
            $scope.yjPopover = $ionicPopover.fromTemplate(htmlTmpStr, {
              scope: $scope
            });
            $scope.yjPopover.show($event);
          } else if ($scope.RecordInfo.wavFullPath) {
            $ionicPopup.alert({
              template: "您已上传语音意见，不可再上传意见附件"
            })
          } else {
            $scope.selFiles("yj");
          }
        }
        $scope.$on('$destroy', function () {
          //销毁意见弹出框
          $scope.yjPopover && $scope.yjPopover.remove();
        });

        //stype为yj表示意见附件
        $scope.selFiles = function (stype) {
          var tmpArray = [];
          var catnum = 0; //附件类型
          var pic = "pickMulti" //单选还是多选
          var isYjAtt = (stype==="yj");//意见附件标识
          //判断是否为意见附件
          if (isYjAtt) {
            catnum = -5;
            pic = "pick"; //单选
          } else {
            if ($ionicTabsDelegate.$getByHandle("webflow").selectedTab().title.indexOf("正文") != -1) {
              catnum = -1
              $scope.MultiText == false ? pic = "pick" : ""
              if ($scope.zhengwen.length && !$scope.MultiText) {
                $ionicPopup.alert({
                  template: "正文已存在，不可重复添加"
                });
                return;
              }
            }
          }

          function getDataURI(src) {
            return $q.resolve(src)
          }
          //判断当前是哪个页签          
          return $imFilePicker[pic]().then(function (data) {
            if (catnum == -1) {
              var noword = data.some(function (file) {
                return file.name.indexOf(".doc") == -1 && file.name.indexOf(".wps") == -1
              })
              if (noword) {
                $ionicPopup.alert({
                  template: "正文只能上传word类型"
                });
                return;
              }
            }
            $q.all(
              data.map(function (att) {
                return att.getBase64Data();
              })
            ).then(function (res) {
              res.forEach(function (b64, index) {
                var ret = {
                  "name": data[index].name,
                  "url": "data:" + data[index].type + ";base64," + b64,
                  "size": $filter('bytes')(data[index].size),
                  "createtime": moment().format("YYYY-MM-DD HH:mm:ss"),
                  "createuser": $scope.context.userinfo.fullname,
                  "catnum": catnum,
                  "businesstype": "default",
                  "getDataURI": function () {
                    return getDataURI("data:" + data[index].type + ";base64," + b64)
                  },
                  "isLocalTempfile": true,
                  "filetype": "default",
                  "tmpflag": (isYjAtt ? 1 : 0)  //如果是意见附件则添加属性tmpflag标识,值为1表示意见附件
                }
                tmpArray.push(ret)
              })
              var duplicateName = $scope.idxfiles.some(function (item) {
                return tmpArray.some(function (innerItem) {
                  return innerItem.name === item.name
                })
              })
              if (duplicateName) {
                $ionicPopup.alert({
                  template: "附件名重复"
                });
                return;
              }
              if(catnum == -5){
                $scope.hasLocalYjFile=true
              }
              $scope.formData.idxfiles = $scope.formData.idxfiles.concat(tmpArray);
            })
          });
        }
        //获取头像
        $scope.getAvatars = function (yjpar) {
          var first = true;
          return (function () {
            if (first) {
              first = false;
              yjpar.forEach(function (yj) {
                if (yj.subhqfk) {
                  if (!angular.isArray(yj.subhqfk)) {
                    yj.subhqfk = [yj.subhqfk]
                  }
                  yj.contact = ContactService.getAvatar(yj.subhqfk[0].user);
                  yj.subhqfk.forEach(function (item) {
                    item.contact = ContactService.getAvatar(item.user);
                  })
                } else {
                  yj.contact = ContactService.getAvatar(yj.user);
                }
              });
            }
          })();
        };
        $scope.lzs = FormData.LzList;
        //是否将意见合并到表单下方
        $scope.commentMoved = indiConfig.modules.webflow.yijianList.moveToFormTab();
        //判断是否订使用了意见订制区,如果是则加载意见
        if ($scope.yijianTabHide || $scope.commentMoved) {
          $scope.getAvatars($scope.yjs);
          $scope.getShenPiJb && $scope.getShenPiJb();
        }
        //判断是否使用了会签来源意见定制模板,如果是则加载
        if ($scope.srcyijianTabHide) {
          $scope.showYjList && $scope.showYjList(2);
        }
        // $scope.lzs[0].user="aaa/xxbx(ss带/xxx)"
        $scope.lzs.forEach(function (item) {
          item.subitem && !angular.isArray(item.subitem) ? item.subitem = [item.subitem] : ""
        })
        if (FormData.CurInfo && FormData.CurInfo[0].flownum && FormData.CurInfo[0].flownum.toString() !== '0' && FormData.CurInfo[0].flownum !== '9999') {
          $scope.lzs.push({
            stat: FormData.CurInfo[0].stat,
            user: FormData.CurInfo[0].hqgtr || FormData.CurInfo[0].user
          })
        }
        if (FormData.CurInfo[0].flownum == '9999') {
          $scope.lzs.push({
            stat: FormData.CurInfo[0].stat
          })
        }
        //流转信息页签信息
        $scope.tabsInfo.flowinfo = {
          count: $scope.lzs.length,
          enable: true
        }
        $scope.curinfo = FormData.CurInfo;
        angular.forEach($scope.curinfo, function (item) {
          item.agentname = $imNotesName.toCN(item.wtfrom);
        })

        defer.resolve($scope.curinfo)
        $scope.getcyy = function () {
          CyyService.get($scope.fileinfo).then(function (data) {
            $scope.defCyy = [];
            $scope.myCyy = [];
            angular.forEach(data, function (item) {
              if (item.user == "*") {
                item.content = item.content.replace(/^#_#/, "");
                $scope.defCyy.push(item);
              } else {
                $scope.myCyy.push(item);
                item.show = false;
              }
            });

            var sorted = $scope.myCyy.some(function (it) {
              return it.weight ? true : false
            })

            if (!sorted) {
              $scope.myCyy = $scope.myCyy.reverse()
            }
          }).then(function () {
            $scope.forbidHandel = {
              "pointer-events": ''
            };
          })
        }
        $scope.getcyy();

        //zhangweiguo修改
        if (FormData.FlowBtns != undefined && FormData.FlowBtns.nextline != undefined) {
          var flag = true;
          if (FormData.FlowBtns.nextline instanceof Array) {
            flag = FormData.FlowBtns.nextline.length > 0;
          }

          $scope.isNextline = (flag && !$stateParams.islocked);
        }
        if ($scope.isflow && FormData.FlowBtns && FormData.FlowBtns.btnsubmit) {
          $scope.isNextline = (true && !$stateParams.islocked);
        }
        if ($stateParams.ass || FormData.form.istrash == 'yes') {
          $scope.isNextline = false //和pc端保持一致，如果是关联文档，不可提交只读
        }
        console.info("文档被锁" + !!$stateParams.islocked);
        if ($scope.isflow) {
          $scope.nextNodeList = FormData.FlowBtns || {
            "nextline": []
          };
          $scope.returnSence = FormData.FlowBtns && FormData.FlowBtns.returnSence;
          $scope.FlowBtns = FormData.FlowBtns;
          if (!$scope.nextNodeList.nextline) {
            $scope.nextNodeList.nextline = [];
          }
        }

        function fnGetFormula(strCondition, nextNodeList) {

          var strFormula = "";
          var strTmpFormula = "";
          angular.forEach(strCondition.split("|"), function (item, index) {
            if (item.indexOf(":") != -1) {
              var aryTmp = item.split(":");
              var objJson = nextNodeList;
              angular.forEach(objJson.conditionfield, function (itemTmp) {
                if (itemTmp.name == aryTmp[0]) {
                  strTmpFormula = fnOperator(itemTmp.value, aryTmp[1], aryTmp[2], aryTmp[3]);
                }
              });
              strFormula += " " + strTmpFormula;
            } else {
              var sOperator = item
              if (item.toLowerCase() == "and") {
                sOperator = "&&"
              }
              if (item.toLowerCase() == "or") {
                sOperator = "||"
              }
              strFormula += " " + sOperator;
            }

          });
          return strFormula;
        }

        function fnOperator(FieldName, strOperator, strValue, strType) {
          var strFormula = "";
          switch (strOperator.toLowerCase()) {
            case "contains":
              strFormula = '"' + FieldName + '".indexOf("' + strValue + '")!==-1';
              break;
            case "not contains":
              strFormula = '"' + FieldName + '".indexOf("' + strValue + '")===-1';
              break;
            default:
              if (strOperator == "=") {
                strOperator = "==";
              }
              if (strType === "N") {
                strFormula = 'parseFloat("' + FieldName + '")' + strOperator + 'parseFloat("' + strValue + '")';
              } else {
                if (strType === "D") {
                  strFormula = 'parseFloat("' + FieldName + '".replace(/-/g,""))' + strOperator + 'parseFloat("' + strValue + '".replace(/-/g,""))';
                } else {
                  strFormula = '"' + FieldName + '"' + strOperator + '"' + strValue + '"';
                }
              }
          }
          return strFormula;
        }
        setCheckBrank = function (conditionfield, nextNodeList) {
          var blnShowBranchDefault = true; //其他条件都不满足时，显示的默认节点
          angular.forEach(conditionfield, function (conditionfield) {
            if ($scope.form.postFileds) {
              $scope.form.postFileds.some(function (item) {
                if (item.name == conditionfield.name) {
                  conditionfield.value = item.value
                }
                return item.name == conditionfield.name
              })
            }
          })
          angular.forEach(nextNodeList.nextline, function (nextline) { //nextline里是数组
            angular.forEach(nextline, function (obj, i) {
              switch (obj.condition) {
                case "":
                  obj.conditionresult = true;
                  break;
                case "[default]":
                  obj.conditionresult = true; //?
                  break;
                default:
                  obj.conditionresult = eval(fnGetFormula(obj.condition, nextNodeList))
                  if (i == 0 && obj.conditionresult) {
                    blnShowBranchDefault = false
                  }
              }
            })
          })
          if (!blnShowBranchDefault) {
            var defaultNode = nextNodeList.nextline.filter(function (nextline) {
              return nextline[0].condition == "[default]"
            })[0];
            if (defaultNode && defaultNode[0]) {
              defaultNode[0].conditionresult = false;
            }
          }
        }
        $scope.fnReCheckBranch = function () {
          setCheckBrank($scope.nextNodeList.conditionfield, $scope.nextNodeList);
          filterNextline();
          var conf = indiConfig.modules.webflow.actionBtn.moveToSubmitPage();
          if (conf && conf.indexOf("huiqian") > -1 && indiConfig.modules.webflow.enableHuiqianStart() == true) {
            if (huiqianobj.length > 0) {
              var hqobj = {
                "name": "会签",
                "id": "9999",
                "type": "huiqian",
                "depsubtree": "",
                "returnSence": "SubmitBtn_sence8",
                "selecttype": "",
                "isAutoDeal": false,
                "notifymail": indiConfig.modules.webflow.zhihuiNotify.mail(),
                "notifysms": indiConfig.modules.webflow.zhihuiNotify.sms(),
                "notifytoread": indiConfig.modules.webflow.zhihuiNotify.toread()
              }
              $scope.form.nodeList.push(hqobj);
            }
          }
          if (conf && conf.indexOf("trash") > -1) {
            if ($filter('filter')($scope.actionBtns, {
                id: "trash"
              }).length > 0) {
              var trashobj = {
                "name": "作废",
                "id": "trash",
                "type": "trash"
              }
              $scope.form.nodeList.push(trashobj);
            }
          }
          if ($scope.form.nodeList.length == 0) {
            return $imTimedInfo.show("未找到满足条件提交环节")
          }
        }
        var filterNextline = function () {
          $scope.form.nodeList = $scope.nextNodeList.nextline.filter(function (item) {
            var flag = true; //跳过的情况
            angular.forEach(item, function (pertj) {
              pertj.target.selecttype != "7" ? pertj.target.depsubtree = "" : "" //如果不是部门子树类型就去掉depsubtree
              flag = flag && pertj.conditionresult
            })
            return flag;
            // return item[0].conditionresult !== false
          }).map(function (item) {
            var id = []
            item.forEach(function (n) {
              id.push(n.target.id)
            })
            var ret = angular.copy(item[item.length - 1].target);
            ret.realSubmitId = id; //同处理人跳过时，加上跳过的环节
            ret = angular.extend(ret, {
              notifymail: indiConfig.modules.webflow.zhihuiNotify.mail(),
              notifysms: indiConfig.modules.webflow.zhihuiNotify.sms(),
              notifytoread: indiConfig.modules.webflow.zhihuiNotify.toread()
            })
            return ret;
          });
          $scope.form.nodeList = _uniqueNodes($scope.form.nodeList);
        }
        if ($scope.isflow) {
          filterNextline();
        }

        function _uniqueNodes(objs) {
          var uniqueNodelist = [];
          angular.forEach(objs, function (node) {
            var flag = true;
            angular.forEach(uniqueNodelist, function (uniquenode) {
              if (node.id == uniquenode.id) {
                flag = false;
              }
            })
            if (flag) {
              uniqueNodelist.push(node);
            }
          })
          return uniqueNodelist
        }
        $scope.form.nodeList = _uniqueNodes($scope.form.nodeList);
        $scope.actionBtns = FormData.ActionBtns;
        if (!$scope.realBtnsinit) {
          $scope.realBtns = getRealBtns();
          $scope.realBtnsinit = true;
        }
        $scope.zhfilter.zhihuiText = '知会';
        $scope.actionBtns.some(function (item) {
          if (item.id === 'zhihui') {
            $scope.zhfilter.zhihuiText = item.label;
            return true;
          }
        })
        if ($scope.managerset && $scope.managerset.zhihui) {
          $scope.zhfilter.zhihuiText = $scope.managerset.zhihui;
        }
        //是否显示知会记录
        $scope.tabsInfo.notify.enable = !!$scope.zhfilter.zhihuiText;

        var huiqianobj = $filter('filter')($scope.actionBtns, {
          id: "huiqian"
        });

        var lasthqtype = $filter('filter')(FormData.LzList, {
          huiqian: "1",
          hqtype: ""
        });
        if (lasthqtype.length > 0) {
          lasthqtype = lasthqtype[lasthqtype.length - 1].hqtype == "并发" ? "并发审批" : "顺序审批"
        } else {
          lasthqtype = "并发审批"
        }
        $scope.lasthq = lasthqtype
        $scope.isbxhq = "no"
        if (huiqianobj.length > 0) {
          $scope.isbxhq = huiqianobj[0].hqrequired
        }
        //提醒记录
        if (FormData.RemindRecord) {
          $scope.remindRecord = JSON.parse(FormData.RemindRecord).reverse();
          //提醒记录数量
          $scope.tabsInfo.remind = {
            count: $scope.remindRecord.length,
            enable: ($scope.remindRecord.length !== 0)
          }
        }
      }).then(function () {
        _filterZh()
      });
    }
    var islockedRE = /用户(.*?)已加锁/;
    FormDataService.addLock({
      protocol: $stateParams.protocol,
      domain: $stateParams.domain,
      dbpath: $stateParams.path,
      unid: $stateParams.id
    }).then(function (data) {
      var islocked = data.msg.match(islockedRE);
      if (islocked && islocked[1]) {
        $stateParams.islocked = true;
        var lockBy = $imNotesName.toCN(islocked[1])
        $imTimedInfo.show(lockBy + '正在处理，请稍后再试', {
          timeout: 1500
        }).then(function () {
          $stateParams.islocked = true;
          $stateParams.lockBy = lockBy;
        }).then(function () {
          $scope.getFormData();
        })
      } else {
        $scope.getFormData();
      }
    });
    $scope.commentsType = "keypad";
    $scope.toggleCommentsType = function () {
      if (indiConfig.modules.webflow.enableVoiceComment() && $scope.commentsType == "keypad") {

        if (cordova.platformId == "ios") {
          if ($scope.hasYjFileinfo) {
            $ionicPopup.alert({
              template: "您已上传意见附件，不可再上传语音意见"
            })
          } else {
            $scope._media = new Media(window._tempFs.root.toURL().replace("file://", "") + "record.wav");
          }
        } else {
          if ($scope.hasYjFileinfo) {
            $ionicPopup.alert({
              template: "您已上传意见附件，不可再上传语音意见"
            })
          } else {
            $scope._media = new Media("cdvfile://localhost/temporary/record.m4a");
          }
        }
        $scope._media.startRecord();
        $timeout(function () {
          $scope._media.stopRecord();
          $scope._media = null;
        });
      }
      $scope.commentsType = $scope.commentsType == "mic" ? "keypad" :
        $scope.commentsType == "keypad" ? "mic" :
        "mic";
    };
    $scope.isMic = function () {
      return $scope.commentsType == "mic"
    };
    $scope.isKeypad = function () {
      return $scope.commentsType == "keypad"
    };

    $scope.writeComment = function (comment) {
      if ($scope.form.comments == undefined) {
        $scope.form.comments = "";
      }
      $scope.form.comments += " " + comment;
      imLocalStorage.setItem('comments' + $stateParams.id, $scope.form.comments)
      $timeout(function () {
        angular.element(document.getElementById('comment-box')).triggerHandler('keyup');
        com = document.getElementById('comment-box');
        com.focus();
      });
    };
    $scope.isSelected = function (index) {
      var len = 0;
      if ($scope.form.denyNodeList) {
        var selectedIndex;
        len = $scope.form.denyNodeList.filter(function (item, index) {
          if (item.inconfigscope) {
            selectedIndex = index;
          }
          return item.inconfigscope == true;
        }).length
        if (len == 1) {
          $scope.form.nextNode = selectedIndex.toString();
        }
      }
      return ($scope.form.nextNode && index == $scope.form.nextNode) || (len == 1);
    }
    $scope.itemShown = function (item) {
      if (~[].concat(item.id).indexOf("9999")) {
        return false;
      }
      //环节为自动确认时判断人员是否为空
      if(item.zdqd === "yes" && item.nodeInfo) {
        if(item.submitto && item.submitto.length===0){
          //alertWhenNull值true表示弹出提示修改流程,false标识出现处理人范围选择
          if(item.nodeInfo.alertWhenNull){
            return false;
          }
        }else{
          return false;
        }
      }
      return item.returnSence == 'SubmitBtn_sence7' || item.returnSence == '';
    }
    $scope.morebtnOuter = function (actionType, options) {
      switch (actionType) {
        case 'submit':
          $scope.submit()
          break;
        case 'bohui':
          $imMorebtnOuter.bohuiClick('bohui', $scope)
          break;
        case 'quick_submit':
          if (options == "0") {
            $scope.form.comments = "同意"
            $scope.submit()
          } else {
            $scope.actionType = "submit";
            $scope.openModal();
          }
          break;
        case 'quick_bohui':
          if (options == "0") {
            $scope.form.comments = "不同意"
            $imMorebtnOuter.bohuiClick('bohui', $scope)
          } else {
            $scope.actionType = "bohui";
            FormDataService.getDeny($scope.fileinfo).then(function (data) {
              items = data.items
              if (items.length == 1) {
                $scope.form.nextNode = '0'; //只有一个默认选中
              }
              if (data.strDenySubmit == '1') { //指定路径
                $scope.form.denyBackWay = "2";
              } else if (data.strDenySubmit == '0') { //直接提交到本环节
                $scope.form.denyBackWay = "1";
              } else {
                $scope.form.denyBackWay = "0";
              }
              $scope.form.denyNodeList = items;
              $scope.form.denyNodeList.forEach(function (item) {
                item.users = item.user.map(function (user) {
                  console.log(user.name)
                  return user.name
                })
                item = angular.extend(item, {
                  mail: item.tmpyoujian == "yes",
                  sms: item.tmpSms == "yes"
                });
              });

              $scope.form.strDenySubmitEdit = (data.strDenySubmitEdit ? (data.strDenySubmitEdit == "yes") : true);

            });
            $scope.openModal();
          }
          break;

        default:
          $imWebflowDelegate.triggerActionBtn(actionType)
      }
    }

    function getRealBtns() {
      var btns = $scope.actionBtns.map(function (btn) {
        var newBtn = angular.copy(btn);
        newBtn.text = getIcon(newBtn);
        newBtn.className = 'btn-' + btn.id
        // console.log("1")
        return newBtn;
      }).filter(function (btn) {
        // console.log("2")
        return !~btn.id.indexOf("chezhuan")
      }).filter(function (btn) {
        // console.log("3")
        return $stateParams.islocked ? (~btn.id.indexOf("guanzhu") || ~btn.id.indexOf("zhihui")) : true //被锁只能关注知会
      });
      
      var enablehq = indiConfig.modules.webflow.enableHuiqianStart();
      var movetoSubmit = indiConfig.modules.webflow.actionBtn.moveToSubmitPage();
      if (movetoSubmit && movetoSubmit.indexOf("trash") > -1 && ['SubmitBtn_sence1', 'SubmitBtn_sence2', 'SubmitBtn_sence4'].indexOf($scope.FlowBtns && $scope.FlowBtns.returnSence) == -1) {
        btns = btns.filter(function (btn) {
          // console.log("4")
          return !~btn.id.indexOf("trash")
        })
      }
      if (enablehq == false) {
        btns = btns.filter(function (btn) {
          // console.log("5")
          return !~btn.id.indexOf("huiqian")
        }).filter(function (btn) {
          // console.log("6")
          return !~btn.id.indexOf("jiaqian")
        }).filter(function (btn) {
          // console.log("7")
          return !~btn.id.indexOf("jianqian")
        })
      } else {
        if (movetoSubmit && movetoSubmit.indexOf("huiqian") > -1) {
          btns = btns.filter(function (btn) {
            // console.log("8")
            return !~btn.id.indexOf("huiqian")
          })
        }
      }
      var fkbtns = btns.filter(function (it) {
        // console.log("9")
        return it.id == "hqgtfk"
      })

      $scope.importantbtns = fkbtns
      btns = btns.filter(function (btn) {
        // console.log("10")
        return btn.id !== "hqgtfk"
      })
      return btns
    }

    function getIcon(btn) {
      var map = {
        "zhihui": "indi-zhihui",
        "zhihuibanbi": "indi-zhihui1",
        "zhijieyiyue": "indi-huifu",
        "zhihuichehui": "indi-zhihui",
        "bohui": "indi-bohui",
        "goutongstart": "indi-goutong",
        "chehui": "indi-chehui",
        "guanzhu": "indi-guanzhu1",
        "forward": "indi-huifu",
        "chehui": "indi-chehui",
        "goutongsubmit": "indi-goutong",
        "goutongend": "indi-goutong1",
        "zancun": "indi-zancun",
        "huiqian": "indi-huiqian",
        "jiaqian": "indi-huiqian1",
        "jianqian": "indi-huiqian-",
        "appenduser": "ion-android-people",
        "jggz": "ion-pull-request",
        "forwardwt": "ion-ios-loop-strong",
        "remind": "ion-android-notifications",
        "qrcode": "ion-android-share-alt"
      };
      // 扩展按钮直接从icon属性取
      var icon = map[btn.id] || btn.icon || "ion-ios-filing";
      if (btn.id == "guanzhu" && btn.label === "取消关注") {
        icon = "indi-guanzhu2"
      }
      return '<i class="icon ' + icon + '"></i>' + btn.label
    }

    function _buttonClicked(index, obj) {
      var clickedbtn

      if (obj.id) {
        clickedbtn = obj
      } else {
        clickedbtn = $scope.realBtns[index]
      }
      switch (clickedbtn.id) {
        case "guanzhu":
          if (clickedbtn.label === "关注") {
            $scope.guanzhu("add").then(function () {
              clickedbtn.label = "取消关注";
              clickedbtn.text = '<i class="icon indi-guanzhu2"></i>取消关注'
            });
          } else if (clickedbtn.label === "取消关注") {
            $scope.guanzhu("del").then(function () {
              clickedbtn.label = "关注";
              clickedbtn.text = '<i class="icon indi-guanzhu1"></i>关注'
            });
          }
          break;
        case "chehui":
          $ionicPopup.confirm({
            title: '确认撤回？',
          }).then(function (res) {
            if (res) {
              $scope.chehui();
            }
          });

          break;
        case "zhihuichehui":
          $ionicPopup.confirm({
            title: '确认撤回？',
          }).then(function (res) {
            if (res) {
              $scope.zhihuichehui();
            }
          });

          break;

        case "zhihui":
          $scope.actionType = "zhihui";
          $scope.form.toread = true;
          $scope.form.mail = true;
          if ($stateParams.lockBy && $stateParams.islocked) {
            $ionicPopup.alert({
              template: "文档已经被" + $stateParams.lockBy + "锁定,暂时不能知会。"
            })
            $scope.hideSheet && $scope.hideSheet()
            return
          }

          FormDataService.checkLock($scope.fileinfo).then(function (data) {
            if (data.stat == "isLock") {
              $ionicPopup.alert({
                template: "文档已经被" + $imNotesName.toCN(data.lockuser) + "锁定,暂时不能知会。"
              })
              $scope.hideSheet && $scope.hideSheet()
              return
            } else {
              if ($scope.form.flowconfig.key_ZhihuiV2 && $scope.form.flowconfig.key_ZhihuiV2[0] == "1") { //v2
                $scope.openModal();
              } else {
                $scope.openSumitModel();
              }
            }
          })


          break;
        case "zhihuibanbi":
          $scope.actionType = "yuebi";
          $rootScope.refreshdy = $stateParams.id; //所有待阅默认就变已阅
          //getzhihui version
          if ($scope.form.flowconfig.key_ZhihuiV2 && $scope.form.flowconfig.key_ZhihuiV2[0] == "1") { //v2
            $scope.openModal();
          } else {
            $scope.openModal();
     
            //$scope.submitFormActions.yuebi();
          }
          break;
        case "zhijieyiyue":
          $scope.submitFormActions.zhijieyiyue();
          break;
        case "goutongstart":
          $scope.actionType = "goutongstart";
          $scope.openModal();
          break;
        case "goutongsubmit":
          $scope.actionType = "goutongsubmit";
          $scope.openModal();
          break;
        case "goutongend":
          $scope.actionType = "goutongend";
          $scope.openModal();
          break;
        case "bohui":
          $scope.actionType = "bohui";
          FormDataService.getDeny($scope.fileinfo).then(function (data) {
            items = data.items
            if (items.length == 1) {
              $scope.form.nextNode = '0'; //只有一个默认选中
            }
            if (data.strDenySubmit == '1') { //指定路径
              $scope.form.denyBackWay = "2";
            } else if (data.strDenySubmit == '0') { //直接提交到本环节
              $scope.form.denyBackWay = "1";
            } else {
              $scope.form.denyBackWay = "0";
            }
            $scope.form.denyNodeList = items;
            $scope.form.denyNodeList.forEach(function (item) {
              item.users = item.user.map(function (user) {
                return user.name
              })
              item = angular.extend(item, {
                mail: item.tmpyoujian == "yes",
                sms: item.tmpSms == "yes"
              });
            });
            $scope.form.strDenySubmitEdit = (data.strDenySubmitEdit ? (data.strDenySubmitEdit == "yes") : true);
          });
          $scope.openModal();
          break;
        case "forward":
          $scope.actionType = "forward";
          $scope.openModal();
          break;
        case "remind":
          $scope.actionType = "remind";
          $scope.currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
          $scope.openModal();
          break;
        case "appenduser":
          $scope.actionType = "appenduser";
          $scope.openModal();
          break;
        case "forwardwt":
          $scope.actionType = "forwardwt";
          $scope.openModal();
          break;
        case "zancun":
          if ($scope.editpath && $scope.editpath.indexOf('editdocument') > 0) {
            var postFileds = {};
            $scope.form.newFmtFileds = $scope.dealFormdata("zancun");
            angular.forEach($scope.form.postFileds, function (item) {
              item.type == "time" ? item.value = moment(item.value).format("HH:mm:ss") : "";
              item.type == "date" ? item.value = moment(item.value).format("YYYY-MM-DD") : "";
              item.type == "date" || item.type == "time" ? item.type = "datetime" : item.type;
              postFileds[item.name] = angular.isArray(item.value) ? item.value : [item.value];
            })
            $scope.form.postFileds = postFileds;
          }
          $scope.form['HAInfo'] = $scope.HAInfo;
          $scope.form['idxfiles'] = $scope.formData.idxfiles;

          FormDataService.zancun($scope.fileinfo, $scope.form).then(function (data) {
            if (data.type == "fail") {
              $ionicPopup.alert({
                template: data.msg
              });
              return
            }
            $imTimedInfo.show('暂存成功').then(function () {
              if (data.type == "success") {
                //暂存重新刷新下页面，否则上传的图片一直在内存中，保存一次加一次
                $ionicHistory.currentView($ionicHistory.backView());
                $state.go($state.current, $stateParams, {
                  location: false,
                  reload: true,
                  inherit: false,
                  notify: true
                });
              }
            });
          })
          break;
        case "fabu":
          if ($scope.editpath && $scope.editpath.indexOf('editdocument') > 0) {
            $imFormDelegate.isValid().then(function () {
              fabuConfirm()
            })
          } else {
            fabuConfirm();
          }

          function fabuConfirm() {
            $ionicPopup.confirm({
              title: '确认发布？',
            }).then(function (res) {
              if (res) {
                var postFileds = {};
                $scope.form.newFmtFileds = $scope.dealFormdata("fabu");
                $scope.form.idxfiles = $scope.formData.idxfiles;
                FormDataService.publish($scope.fileinfo, $scope.form).then(function (data) {
                  if (data.type == "fail") {
                    $ionicPopup.alert({
                      template: data.msg
                    });
                    return
                  }
                  $imTimedInfo.show('发布成功').then(function () {
                    $imHistory.backToList();
                  });
                })
              }
            });
          }
          break;
        case "msddyj":
          FormDataService.getmsdllealers($scope.fileinfo).then(function (data) {
            if (data.leaders.length == 1) {
              return data.leaders[0];
            } else {
              //多个人的情况
              return data.leaders[0];
            }
          }).then(function (data) {
            data = "CN=" + data.split("/")[0] + "/O=" + data.split("/")[1]
            var param = angular.extend($scope.fileinfo, {
              strFrom: data
            });
            FormDataService.jieguan(param).then(function (data) {
              if (data.type == 'success') {
                $ionicHistory.currentView($ionicHistory.backView());
                $state.go($state.current, $stateParams, {
                  location: false,
                  reload: true,
                  inherit: false,
                  notify: true
                });
              } else {
                $imTimedInfo.show(data.msg)
              }
            })
          })
          break;

        case "jggz":
          var param = angular.extend($scope.fileinfo, {
            strFrom: $scope.curinfo[0].user
          });
          FormDataService.jieguan(param, "abrole", "replacedealer").then(function (data) {
            if (data.type == 'success') {
              $ionicHistory.currentView($ionicHistory.backView());
              $state.go($state.current, $stateParams, {
                location: false,
                reload: true,
                inherit: false,
                notify: true
              });
            } else {
              $imTimedInfo.show(data.msg)
            }
          })

          break;
        case "huiqian":
          $scope.actionType = "huiqian";
          $scope.openModal();
          break;
        case "jiaqian":
          $scope.actionType = "jiaqian";
          $scope.openModal();
          break;
        case "jianqian":
          $scope.actionType = "jianqian";
          $scope.openModal();
          break;
        case "hqfk":
          $scope.actionType = "hqfk";
          $scope.openModal();
          break;
        case "hqgtfk":
          $scope.actionType = "hqgtfk";
          // $scope.openModal();
          $scope.submitFormActions.hqfk(false); //人员反馈
          break;
        case "qrcode":
          $scope.actionType = "qrcode";
          var redirectoStr = "/webflow/" + $scope.fileinfo.domain + $scope.fileinfo.dbpath + "/" + $scope.fileinfo.unid
          $imUrl.getRootForBrowser().then(function (data) {
            $scope.qr_data = data + "www/qrcode.html?action=redirectto&url=" + redirectoStr
            $scope.qrcodeModal.show();
          })

          break;
        case "trash":
          var q;
          if ($scope.formData.flowconfig.Key_GetTrashReason != '1') {
            q = $q.when(true)
          } else {
            q = $ionicPopup.show({
              template: '<ion-item class="item item-input">' +
                '<input type="text" ng-model="formData.trashReason" placeholder="作废原因"/></ion-item>',
              scope: $scope,
              buttons: [{
                text: '取消'
              }, {
                text: '<b>确定</b>',
                type: 'button-positive',
                onTap: function (e) {
                  return true;
                }
              }]
            }).then(function (res) {
              return res
            });
          }
          q.then(function (data) {
            if (!data) return
            FormDataService.trash($scope.fileinfo, $scope.formData).then(function (data) {
              if (data.type == 'success') {
                $imTimedInfo.show('作废成功').then(function () {
                  imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                  $rootScope.refresh = true;
                  $imHistory.backToList();
                });
              }
            })
          })
          break;
        case "huifu":
          FormDataService.resume($scope.fileinfo).then(function (data) {
            if (data.type == 'success') {
              $imTimedInfo.show('文件已恢复').then(function () {
                $rootScope.refresh = true;
                $imHistory.backToList();
                $ionicHistory.currentView($ionicHistory.backView());
                $state.go($state.current, $stateParams, {
                  location: false,
                  reload: true,
                  inherit: false,
                  notify: true
                });
              });
            }
          })
          break;
        default:
          if ($imFormDelegate._instances.length) {
            // 如果是开发的表单，通知内部的formCtrl
            $scope.$broadcast("$im.webflow.actionbtn.click", clickedbtn);
          } else {
            // 配置的表单，通知到rootscope，带上子表单和数据库路径
            $scope.$emit("$im.webflow.actionbtn.click", clickedbtn, {
              subform: $scope.formData.subform[0],
              dbpath: $stateParams.path,
              domain: $stateParams.domain,
              unid: $stateParams.id
            });
          }
      }
      return true;
    }

    $scope.dealFormdata = function (action) {
      $scope.form.postFileds = $imFormDelegate.getFormData();
      //后台接口中，暂存字符串要指定为string，发布和提交则为空
      var defaultType = action === "fabu" || action === "submit" ? "" : "string"
      var newfmtFields = []
      angular.forEach($scope.form.postFileds, function (item) {
        item.type == "number" ? item.value = parseFloat(item.value) : item.value;
        if (item.type == "date" || item.type == "time" || item.type == "datetime") { //日期类型的数据必须是合法的日期才能保存，否则接口报错，所以非法的日期不提交
          if (moment(item.value).isValid()) { //是否合法的日期
            item.type == "time" ? item.value = moment(item.value).format("HH:mm:ss") : "";
            item.type == "date" ? item.value = moment(item.value).format("YYYY-MM-DD") : "";
            item.type == "datetime" ? item.value = moment(item.value).format("YYYY-MM-DD HH:mm:ss") : "";
            item.type = "datetime"
            newfmtFields.push({
              "name": item.name,
              "type": item.type ? item.type : defaultType,
              "value": angular.isArray(item.value) ? item.value : [item.value]
            });
          }
        } else if (isNaN(item.value) && typeof item.value == "number") {} else {
          newfmtFields.push({
            "name": item.name,
            "type": item.type ? item.type : defaultType,
            "value": angular.isArray(item.value) ? item.value : [item.value]
          });
        }
      })
      return newfmtFields
    };

    $scope.moreAction = function () {
      $scope.hideSheet = $ionicActionSheet.show({
        activityStyle: true,
        buttons: $scope.realBtns,
        cancelText: '取消',
        buttonClicked: _buttonClicked
      });
    };

    $ionicModal.fromTemplateUrl('app/webflow/goutongend.html', {
      scope: $scope,
      animation: 'slide-in-right'
    }).then(function (modal) {
      $scope.goutongendpage = modal;
      $scope.cancelGoutong = function () {
        $scope.goutongendpage.hide();
      };
      $scope.endGoutong = function () {
        var dealers = $scope.form.goutongdealers.filter(function (item) {
          return item.checked
        }).map(function (item) {
          return item.dealer
        });
        if (dealers.length == 0) {
          return $imTimedInfo.show("请至少选择一个终止沟通人员")
        }
        if (!$scope.form.goutong) {
          $scope.form.goutong = {}
        }
        var strNotifyWay = Object.keys($scope.form.goutong).filter(function (key) {
          return ~["mail", "sms"].indexOf(key) && $scope.form.goutong[key]
        }).map(function (key) {
          return key;
        });
        $scope.form['HAInfo'] = $scope.HAInfo;
        FormDataService.goutongendsubmit($scope.fileinfo, dealers, strNotifyWay, $scope.form)
          .then(function (data) {
            if (data.msg != "完成审批") {
              data.msg = data.msg.substring(0, data.msg.length - 1);
            }
            imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
            return $imTimedInfo.show(data.msg)
          })
          .then(function () {
            return $scope.goutongendpage.hide()
          })
          .then(function () {
            //  $rootScope.refresh = true;
            //$state.go("tab.home.todo");
            $imHistory.backToList();
          });
      };
    });

    $ionicModal.fromTemplateUrl('app/webflow/qrcode.html', {
      scope: $scope,
      animation: 'slide-in-up',
      focusFirstInput: true
    }).then(function (modal) {
      $scope.qrcodeModal = modal;
    });

    $ionicModal.fromTemplateUrl('app/webflow/comments.html', {
      scope: $scope,
      animation: 'slide-in-up',
      focusFirstInput: true
    }).then(function (modal) {
      $scope.commentModal = modal;
    });
    $ionicModal.fromTemplateUrl('app/webflow/submitpage.html', {
      scope: $scope,
      animation: 'slide-in-right'
    }).then(function (modal) {
      $scope.submitModal = modal;
    });
    var noyjAction = false;
    $scope.openModal = function () {
      if (arguments[0] == 'submit' && indiConfig.modules.webflow.returnSubmitPage()) {
        $scope.actionType = 'writeComment';
      } else if (arguments[0] == 'submit') {
        $scope.actionType = "submit";
      }
      if (arguments[0] == 'hqgtfk') {
        $scope.actionType = 'hqgtfk'
      }
      $ionicSlideBoxDelegate.update();
      var data = {
        subform: $scope.formData.subform[0],
        dbpath: $scope.fileinfo.dbpath,
        fldTypeId: $scope.formData.typeid[0],
        fldtype: $scope.formData.type[0],
        actionType: $scope.actionType,
        setCustomClass: function (css) {
          $scope.customCommentModelCss = css
        }
      }
      noyjAction = $scope.$emit("$im.webflow.commentModal.beforeShow", data).defaultPrevented;
      if (noyjAction || ($scope.formData.power.canHandAttitude != '1' && $scope.actionType !== "yuebi" && $scope.actionType !== "zhihui") || $scope.actionType == "remind") { //通过扩展，如果不需要写意见就不弹出了
        $scope.closeModal();
      } else {
        var yjcontent = $scope.form.comments;

        function isCN(str) { //判断是不是中文
          var regexCh = /[^\u4e00-\u9fa5]/;
          return !regexCh.test(str);
        }

        function isent(str) {
          var reg = /\n/;
          return reg.test(str)
        }
        if (yjcontent == "" || !yjcontent) {
          $scope.rows = 1;
        }
        if (yjcontent && yjcontent != "") {
          var entLen = 0
          var yjlength = yjcontent.length;
          var strlenght = 0;
          for (var i = 0; i < yjlength; i++) {
            if (isent(yjcontent.charAt(i))) {
              entLen += 1;
            }
            if (isCN(yjcontent.charAt(i)) == true) {
              strlenght = strlenght + 2; //中文为2个字符
            } else {
              strlenght = strlenght + 1; //英文一个字符
            }
          }
          yjlength = Math.floor(strlenght / 2);
          if (yjlength < 12) {
            $scope.rows = 1;
          } else if (yjlength >= 12 && yjlength < 24) {
            $scope.rows = 2;
          } else if (yjlength >= 24 && yjlength < 36) {
            $scope.rows = 3;
          } else if (yjlength >= 36 && yjlength < 48) {
            $scope.rows = 4;
          } else {
            $scope.rows = 5;
          }
          $scope.rows = $scope.rows + entLen;
          if ($scope.rows > 5) {
            $scope.rows = 5;
          }
        }
        $scope.commentModal.show();
      }
    };
    var getobjKeys = function (obj) {
      var keys = [];
      for (var key in obj) {
        if (key != "$$hashKey") {
          keys.push(key);
        }

      }
      return keys;
    };
    var checkYj = function (validatecfg) {
      var mprom; //意见校验
      var ha = $scope.HAInfo.data;
      var comments = $scope.form.comments;
      var yuyinatt = $scope.form.yjatt.name;
      var yyVoice = $scope.RecordInfo.isRecording;
      var iscommentModal = $scope.commentModal._isShown;
      //如果已经上传了意见附件则不弹出提示
      if ($scope.enableFileComment && $scope.hasYjFileinfo) {
        return $q.when([true, iscommentModal]);
      }
      //if (!comments&&!yuyinatt &&!ha&&$scope.formData.power.canHandAttitude=='1' && !noyjAction) {
      if (!(comments || yuyinatt || ha || yyVoice || noyjAction || $scope.formData.power.canHandAttitude != '1')) {
        switch (validatecfg) {
          case "0":
            mprom = $q.when([true, iscommentModal])
            break;
          case "2":
            mprom = $ionicPopup.alert({
              title: '消息提示',
              template: '您必须填写审批意见'
            }).then(function () {
              if (indiConfig.modules.webflow.returnSubmitPage() && $scope.actionType == 'submit') {
                iscommentModal = $scope.commentModal._isShown = true;
                return [false, iscommentModal]
              } else {
                return [false, iscommentModal];
              }
            })
            break;
          default:
            mprom = $ionicPopup.confirm({
              title: '消息提示',
              template: '您还没有填写意见，是否确定？',
              cancelText: '取消',
              okText: '确定'
            }).then(function (falg) {
              if (falg) {
                return [true, iscommentModal]
              } else if (indiConfig.modules.webflow.returnSubmitPage() && $scope.actionType == 'submit') {
                iscommentModal = $scope.commentModal._isShown = true;
                return [false, iscommentModal];
              } else {
                return [false, iscommentModal]
              }
            })
        }
      } else {
        mprom = $q.when([true, iscommentModal])
      }
      return mprom;
    }
    $scope.openSumitModel = function () {
      var data = {
        subform: $scope.formData.subform[0],
        dbpath: $scope.fileinfo.dbpath,
        fldTypeId: $scope.formData.typeid[0],
        fldtype: $scope.formData.type[0],
        actionType: $scope.actionType,
        setCustomClass: function (css) {
          $scope.customSubmitModelCss = css
        },
        submitData: $scope.form
      }
      $scope.$emit("$im.webflow.submitModal.beforeShow", data);
      if (!$scope.submitModal._isShown) {
        $scope.submitModal.show();
      }
      $scope.hideOkinSumitModel=""
      if(indiConfig.modules.webflow.submit.doubleCheckWhenNoOptionFlowSubmit()){//开关如果保持原状态，不变
        return
      }
      if($scope.actionType!="submit" && $scope.actionType!="hqfk"){
        return
      }
      if($scope.form.nodeList.length == 1){
        if(['SubmitBtn_sence10','SubmitBtn_sence6'].indexOf($scope.form.nodeList[0].returnSence)!=-1){
          $scope.hideOkinSumitModel="true"
        }
        if($scope.form.nodeList[0].type=="hqfk" && $scope.form.flowconfig.key_SelectFKJY=="0" && $scope.form.flowconfig.key_HQFKSelectAtt=="0"){//会签反馈,并且不需要反馈意见
          $scope.hideOkinSumitModel="true"
          $scope.formData.idxfiles.concat($scope.idxfiles).some(function(idx){
            if(idx.catnum=="-5"){
              $scope.hideOkinSumitModel=""
              return true
            }
          })
        }
      }
    }
    $scope.closeModal = function () {
      switch ($scope.actionType) {
        case "chehui":
          break;
        case "zhihui":
          $scope.openSumitModel();
          break;
        case "yuebi":
          $scope.submitFormActions.yuebi();
          break;
        case "goutongsubmit":
          checkYj($scope.formData.power.gtyjvalidatecfg).then(function (res) {
            if (res[0]) {
              $scope.submitFormActions.goutongsubmit();
            } else {
              if (res[1]) {
                $scope.openModal();
              }
            }
          });
          break;
        case "forward":
        case "appenduser":
        case "forwardwt":
        case "bohui":
        case "goutongstart":
          checkYj($scope.formData.power.yjvalidatecfg).then(function (res) {
            if (res[0]) {
              $scope.openSumitModel();
            } else {
              if (res[1]) {
                $scope.openModal();
              }
            }
          });
          break;
        case "goutongend":
          FormDataService.goutongperson($scope.fileinfo).then(function (data) {
            $scope.form.goutongdealers = data.dealers.map(function (item) {
              var key = Object.keys(item)[0];
              return {
                "dealer": key,
                "extDealer": item[key]
              }
            });
            $scope.goutongendpage.show();
          })
          break;
        case "zancun": //zhangweiguo修改
          FormDataService.zancun($scope.fileinfo, $scope.form).then(function (data) {
            $imTimedInfo.show("暂存成功").then(function () {
              if (data.type == "success") {
                //暂存重新刷新下页面
                $ionicHistory.currentView($ionicHistory.backView());
                $state.go($state.current, $stateParams, {
                  location: false,
                  reload: true,
                  inherit: false,
                  notify: true
                });
              }
            });
          })
          break;
        case "huiqian":
          $scope.submittitle = "会签"
          $scope.openSumitModel();
          break;
        case "jiaqian":
          $scope.form.hqtype = $scope.lasthq
          $scope.submittitle = "加签"
          $scope.openSumitModel();
          break;
        case "jianqian":
          $scope.jqBlYJArea = false;
          $ionicScrollDelegate.$getByHandle("subitpagejianqian").scrollTop();
          FormDataService.gethqselect($scope.fileinfo, $scope.form, "jianqian").then(function (data) {
            FormDataService.gethqrylist($scope.fileinfo, $scope.form).then(function (chrylist) {
              if (data.length == 1 && data[0].id == "") {
                data = [];
              }
              var persons = [];
              angular.forEach(chrylist.dealers, function (value, key) {
                persons.push({
                  text: getobjKeys(value)[0],
                  checked: false
                })
              });
              $scope.submittitle = "减签"
              $scope.form.jqdept = data
              $scope.form.selectJqYj = [];
              $scope.form.selectJqYjLength = 0;
              angular.forEach($scope.form.jqdept, function (item) {
                item.hjyj && angular.forEach(item.hjyj[0].yjinfo, function (yj) {
                  $scope.form.selectJqYjLength++;
                })
              })
              $scope.form.jqperson = persons;
              $scope.openSumitModel();
            });
          });

          break;
        case "hqfk":
          var key_SelectFKJY = $scope.formData.flowconfig.key_SelectFKJY;
          if ( $scope.showSelectBox) {
            $scope.form.nodeList.forEach(function (item, index) {
              if (item.type == "hqfk") {
                $scope.form.nextNode = index
              }
            })
            $scope.openSumitModel();
          }
          break;
        case "qrcode":
          $scope.qrcodeModal.hide();
          break;
        case "hqgtfk":
          $scope.submitFormActions.hqfk(false); //人员反馈
          break;
        case "remind":
          FormDataService.getRemindUser($scope.fileinfo).then(function (data) {
            $scope.form.selectRemindUser = [];
            $scope.form.selectRemindHqUser = [];
            $scope.form.selectRemindHqbmUser = [];
            $scope.form.remindLen = 0;
            if (data.hqbm) {
              angular.forEach(data.hqbm, function (bm) {
                $scope.form.remindLen += bm.spr && bm.spr.length
              })
            }
            if (!data.hqry) {
              data.hqry = []
            }
            if (!data.authors) {
              data.authors = []
            }
            $scope.form.remindLen = $scope.form.remindLen + data.authors.length + data.hqry.length
            if ($scope.form.remindLen == 1) {
              $scope.form.selectRemindUser = data.authors.length > 0 ? data.authors[0] : (data.hqry.length > 0 ? data.hqry[0] : (data.hqbm ? data.hqbm[0].spr[0] : ''))
              $scope.form.selectRemindUser = [].concat($scope.form.selectRemindUser)
            }
            $scope.form.remindUserData = data;
            $scope.openSumitModel();
          });
          break;
        case "writeComment":
          break;
        default:
          $scope.submit();
      }

      $scope.commentModal.hide();
      $timeout(function () {
        delete $scope.customCommentModelCss;
      }, 100)
    };
    $scope.checkAlljqYJ = function () {
      if ($scope.form.selectJqYjLength == $scope.form.selectJqYj.length) {
        $scope.form.selectJqYj = [];
      } else {
        $scope.form.selectJqYj = []
        angular.forEach($scope.form.jqdept, function (item) {
          item.hjyj && item.hjyj[0].yjinfo.map(function (yj) {
            if (yj.show) {
              return $scope.form.selectJqYj.push(yj.yjkey)
            }
          })
        })
      }
    }
    $scope.showJqdeftYJ = function (checked, index) {
      $ionicScrollDelegate.resize();
      $scope.jqBlYJArea = false
      if (checked) {
        $scope.form.jqdept[index].hjyj && angular.forEach($scope.form.jqdept[index].hjyj[0].yjinfo, function (yj) {
          yj.show = true;
        })
      } else {
        $scope.form.jqdept[index].hjyj && angular.forEach($scope.form.jqdept[index].hjyj[0].yjinfo, function (yj) {
          yj.show = undefined;
          angular.forEach($scope.form.selectJqYj, function (key, yjindex) {
            if (key == yj.yjkey) {
              $scope.form.selectJqYj.splice(yjindex--, 1)
            }
          })
        })
      }
      $scope.jqBlYJArea = $scope.form.jqdept.some(function (dept) {
        if (dept.checked && dept.hjyj) {
          return true;
        }
      })
    }
    $scope.cancelComment = function () { //修复退出模块输入框高度还原
      var inputbox = document.getElementById('comment-box');
      // inputbox.rows = 1;
      // $scope.form.comments = "";
      $scope.actionType = 'submit'
      $scope.commentModal.hide();
      $timeout(function () {
        delete $scope.customCommentModelCss;
      }, 100)
    };
    $scope.saveComments = function () {
      imLocalStorage.setItem('comments' + $stateParams.id, $scope.form.comments)
    }
    $scope.form.comments = imLocalStorage.getItem('comments' + $stateParams.id)
    $scope.submit = function () {
      var isSubmit = arguments[0];
      if ($scope.editpath && $scope.editpath.indexOf('editdocument') > 0) {
        $imFormDelegate.isValid().then(function () {
          $scope.form.postFileds = $imFormDelegate.getFormData();
          angular.forEach($scope.form.postFileds, function (item) {
            item.type == "time" ? item.value = moment(item.value).format("HH:mm:ss") : "";
            item.type == "date" ? item.value = moment(item.value).format("YYYY-MM-DD") : "";
            item.type == "date" || item.type == "time" ? item.type = "datetime" : "";
          })
          beforecheck()
        })
      } else {
        beforecheck()
      }

      function beforecheck() {
        if ($scope.isbxhq == "yes") {
          var alertPopup = $ionicPopup.alert({
            template: "当前环节必须会签"
          });
          return;
        }
        if (isSubmit == 'submit' && indiConfig.modules.webflow.returnSubmitPage()) {
          $scope.openModal();
          $scope.actionType = "submit";
          return;
        }
        checkYj($scope.formData.power.yjvalidatecfg).then(function (res) {
          if (res[0]) {
            _submit();

          } else {
            if (res[1]) {
              $scope.openModal();
            }
          }
        });
      }

      function _submit() {
        if ("SubmitBtn_sence4" != $scope.returnSence && "SubmitBtn_sence3" != $scope.returnSence && "SubmitBtn_sence1" != $scope.returnSence && "SubmitBtn_sence2" != $scope.returnSence && $scope.isNextline) { //不是环节内顺序审批的提醒下
          $scope.fnReCheckBranch() //条件分支
        }
        var immediateSence = ['SubmitBtn_sence1', 'SubmitBtn_sence2', 'SubmitBtn_sence4'];
        if (~immediateSence.indexOf($scope.returnSence)) {
          $scope.isProcessing = true
          $ionicLoading.show({
            template: '<div ng-click="cancelXhr()"><ion-spinner class="spinnerContent" icon="ios"></ion-spinner>\
            <span class="loading-msg1">正在加载</span> <i class="icon ion-android-close"></i></div>',
            noBackdrop: false
          });

          $scope.submitFormAuto();
        } else if ("SubmitBtn_sence5" == $scope.returnSence) {
          if ($scope.form.nodeList.length == 1) {//只有一个环节，并且非直接处理的，默认选中
            if(indiConfig.modules.webflow.submit.doubleCheckWhenNoOptionFlowSubmit()){//开关如果保持原状态，不变
              $scope.form.nextNode = "0";
            }else{
              var item=$scope.form.nodeList[0]
              var returnSence=item.returnSence
              if(returnSence=="SubmitBtn_sence10"||item.returnSence=="SubmitBtn_sence6"){//流程结束\合并
                $scope.form.nextNode=undefined
              }else if(item.type=="hqfk" && $scope.form.flowconfig.key_SelectFKJY=="0" && $scope.form.flowconfig.key_HQFKSelectAtt=="0"){//会签反馈,并且不需要反馈意见
                $scope.form.nextNode = undefined;
                $scope.formData.idxfiles.concat($scope.idxfiles).some(function(idx){
                  if(idx.catnum=="-5"){
                    $scope.form.nextNode="0"
                    return true
                  }
                })
              }else{
                $scope.form.nextNode = "0";
              }
            }
          }
          $scope.actionType = "submit";
          $scope.form.nodeList.forEach(function (item) {
            // if ("SubmitBtn_sence7" != item.returnSence) return;//由于打开环节选择放到回调里了，判断也放到里面去
            var param = angular.extend($scope.fileinfo, {
              nodeid: item.id
            });
            NodeInfoService.get(param).then(function (data) {
              $scope.isWyqd = 'no';
              if (data.userule) {
                if (data.userule.type[0] == '2') {
                  if ($scope.form.postFileds) {
                    var user = $scope.form.postFileds.filter(function (item) {
                      return item.name == data.userule.value[0];
                    })
                    data.submitto = user[0].value == "" ? [] : user[0].value;
                  }
                }
              }
              //选择范围
              item.scoperule = data.scoperule;

              if (data.scopeuser && data.scopeuser.length == 1) {
                if (data.scopeuser[0] != "" && data.submitto.length == 0) {
                  data.submitto.push(data.scopeuser[0]);
                } else {
                  if (data.zdqd == "yes") {
                    $scope.isWyqd = 'yes';
                  }
                }
              }
              if (item.selecttype === '0') {
                data.scopeuser = data.submitto
              }
              if ("SubmitBtn_sence7" == item.returnSence) {
                item = angular.extend(item, data);
              }
            }).then(function () { //自动提交
              if($scope.form.nodeList.length == 1 && $scope.form.nodeList[0].returnSence == 'SubmitBtn_sence9'){
                //流程分裂也是自动
                 $scope.submitForm()
              }else if ($scope.form.nodeList.length == 1 && $scope.form.nodeList[0].zdqd == 'yes') { //自动确定
                if ($scope.form.nodeList[0].submitto.length > 0) {
                  $scope.submitForm();
                } else {
                  $ionicPopup.alert({
                    template: "自动提交默认处理人为空，或者用户被禁用删除，请联系管理员"
                  })
                }
              } else {
                if (!$scope.submitModal._isShown) {
                  $scope.openSumitModel();
                }
              }
            }, function (err) {
              $ionicPopup.alert({
                template: "获取下一环节信息出错"
              }).then(function () {
                $imHistory.backToList();
              })
            });
          });
        } else if ("SubmitBtn_sence3" == $scope.returnSence) {
          $scope.isProcessing = true

          $ionicLoading.show({
            template: '<div ng-click="cancelXhr()"><ion-spinner class="spinnerContent" icon="ios"></ion-spinner>\
            <span class="loading-msg1">正在加载</span> <i class="icon ion-android-close"></i></div>',
            noBackdrop: false
          });
          var param = angular.extend($scope.fileinfo, {
            nodeid: $scope.FlowBtns && $scope.FlowBtns.btnsubmit.curnode
          });
          NodeInfoService.getNextNode(param).then(function (data) {
            //直接提交无需参数
            var immediateSence = ['GetNextNode_sence1', 'GetNextNode_sence2'];
            var sendNodeIdSence = [];
            if (~immediateSence.indexOf(data.returnSence)) {
              $scope.submitFormAuto();
            } else if ("GetNextNode_sence4" == data.returnSence) {
              $scope.form.nextNodeId = "9999";
              $scope.submitFormAuto();
            }
          }, function () {
            $ionicLoading.hide()
          });
        }

      }
    };

    $scope.zhihuichehui = function () {
      FormDataService.zhihuichehuiinfo($scope.fileinfo).then(function (data) {
        var chehuisuzhu = []
        angular.forEach(data, function (item, index) {
          var zhihuiren = item.to
          chehuisuzhu[index] = {};
          chehuisuzhu[index][zhihuiren] = item.unid;
        });
        var chehuparam = {
          "content": chehuisuzhu,
          "yj": " 撤回意见"
        }
        FormDataService.zhihuichehui($scope.fileinfo, chehuparam).then(function (data) {
          $imTimedInfo.show("撤回成功").then(function () {
            //  $rootScope.refresh = true;
            //$state.go("tab.home.todo");
            $imHistory.backToList();
          });
        })

      });
    }

    $scope.mergeOrSplit = function (val) {
      if (val && $scope.form.nodeList[val]) {
        if ("SubmitBtn_sence9" == $scope.form.nodeList[val].returnSence) {
          var param = angular.extend($scope.fileinfo, {
            nodeid: $scope.form.nodeList[val].id
          });
          NodeInfoService.getBxfzSplitNode(param)
            .then($scope.toSplitNode)
            .then(function (data) {
              $scope.form.strBxfz = {
                "items": data
              };
              $scope.form.idxfiles = $scope.formData.idxfiles;
              FormDataService.bxfzSplit($scope.fileinfo, $scope.form)
                .then($scope.submitFormActions.afterSubmit).then(function () {
                  $rootScope.refresh = true;
                });

            });
        } else if ("SubmitBtn_sence10" == $scope.form.nodeList[val].returnSence) {
          var param = angular.extend($scope.fileinfo, {
            nodeid: $scope.form.nodeList[val].id,
            action: "bxfz"
          });
          NodeInfoService.getNextNode(param).then(function (data) {
            var immediateSence = ['GetNextNode_sence1', 'GetNextNode_sence2'];
            if (~immediateSence.indexOf(data.returnSence)) {
              $scope.submitFormAuto();
            } else if ("GetNextNode_sence8" == data.returnSence) {
              $scope.form.strBxhbFlag = "bxtj";
              $scope.submitFormAuto();
            } else if ("GetNextNode_sence9" == data.returnSence) {
              var nextid = _getMergeInfo($scope.form.nodeList[val]);
              $scope.form.nextNodeId = nextid;
              $scope.form.nextNode = null;
              $scope.form.strBxhbFlag = "bxtj";
              $scope.submitFormAuto();
            } else if ("GetNextNode_sence10" == data.returnSence) {
              param.nodeid = _getMergeInfo($scope.form.nodeList[val]);
              $scope.toMergeNode(data, param)
            } else if ("GetNextNode_sence11" == data.returnSence) {
              delete $scope.fileinfo.nodeid
              param.nodeid = _getMergeInfo($scope.form.nodeList[val]);

              //获取合并环节处理人相关信息
              var tmpParam = angular.copy(param);
              tmpParam.nodeid = tmpParam.nodeid[tmpParam.nodeid.length - 1];
              NodeInfoService.get(tmpParam).then(function (cdata) {
                $scope.isWyqd = 'no';
                //选择范围
                data.scoperule = cdata.scoperule;

                if (cdata.userule) {
                  if (cdata.userule.type[0] == '2') {
                    if ($scope.form.postFileds) {
                      var user = $scope.form.postFileds.filter(function (item) {
                        return item.name == cdata.userule.value[0];
                      })
                      cdata.submitto = user[0].value;
                    }
                  }
                }
                if (cdata.scopeuser && cdata.scopeuser.length == 1) {
                  if (cdata.scopeuser[0] != "" && cdata.submitto.length == 0) {
                    cdata.submitto.push(cdata.scopeuser[0]);
                  } else {
                    if (cdata.zdqd == "yes") {
                      $scope.isWyqd = 'yes';
                    }
                  }
                }
                //存储至临时变量中
                $scope.tmpData = cdata;
              }).then(function () {
                //将处理人信息添加至环节属性中
                if (data.nextline && data.nextline[0]) {
                  angular.extend(data.nextline[0][0].target, $scope.tmpData);
                }
                $scope.toMergeNode(data, param);
              }, function (err) {
                $ionicPopup.alert({
                  template: "获取下一环节信息出错"
                }).then(function () {
                  $imHistory.backToList();
                })
              });

            }
          });
        }
      }
    }

    var _unique = function (arr) {
      var unique = {};
      return arr.filter(function (item) {
        if (!unique[item]) {
          unique[item] = true;
          return true;
        }
        return false;
      });
    };
    var _getMergeInfo = function (data) {
      var ret = [data.id];
      if (data.merger && data.merger.nextline) {
        ret = ret.concat(_getMergeInfo(data.merger.nextline[0][0].target))
      }
      return ret;
    };
    $scope.toMergeNode = function (nextNode, param) {
      var modalScope = $scope.$new();
      modalScope.form = angular.copy($scope.form);
      modalScope.form.nodeList = nextNode.nextline.map(function (item) {
        var ret = angular.copy(item[0].target);

        ret.id = _unique([].concat(param.nodeid, _getMergeInfo(ret)))
        return ret
      });
      if (modalScope.form.nodeList.length == 1) {
        modalScope.form.nextNode = "0";
      }
      var initModal = $ionicModal.fromTemplateUrl('app/webflow/submitpage.html', {
        scope: modalScope,
        animation: 'slide-in-right'
      });
      return $q(function (resolve, reject) {
        initModal.then(function (modal) {
          modalScope.hideOkinSumitModel=""
          modal.show();
          if (modalScope.form.nodeList.length == 1 && modalScope.form.nodeList[0].zdqd == "yes" && modalScope.form.nodeList[0].submitto.length > 0) {
            modal.hide().then(function () {
              $scope.form.nextNode = modalScope.form.nextNode;
              $scope.form.nodeList = modalScope.form.nodeList;
              $scope.form.strBxhbFlag = "bxhb";
              $scope.submitFormAuto();
            })
          }
          modalScope.cancelSubmit = function () {
            if($scope.form.nodeList.length==1){
              $scope.form.nextNode = undefined;
            }
            modal.hide();
          };
          modalScope.submitForm = function () {
            if (!modalScope.form.nextNode) {
              $imTimedInfo.show("请选择下一环节")
              return false;
            };
            if ($scope.actionType == "submit" &&
              modalScope.form.nodeList[modalScope.form.nextNode].submitto &&
              modalScope.form.nodeList[modalScope.form.nextNode].submitto.length <= 0) {
              $imTimedInfo.show("下一环节处理人不能为空")
              return false;
            };
            $scope.submitModal.hide().then(function () {
              modal.hide().then(function () {
                $scope.form.nextNode = modalScope.form.nextNode;
                $scope.form.nodeList = modalScope.form.nodeList;
                $scope.form.strBxhbFlag = "bxhb";
                $scope.submitFormAuto();
              })
            });

          };
        });
      });
    };
    $scope.toSplitNode = function (splitInfo) {
      // console.log(splitInfo)
      var modalScope = $scope.$new();
      modalScope.modalCtrl = {
        data: splitInfo
      };
      setCheckBrank(modalScope.modalCtrl.data.conditionfield, modalScope.modalCtrl.data)
      modalScope.modalCtrl.nodeList = modalScope.modalCtrl.data.nextline.filter(function (item) {
        var flag = true
        angular.forEach(item, function (pertj) {
          flag = flag && pertj.conditionresult
        })
        return flag;
      }).map(function (item) {
        var ret = angular.copy(item[0].target);
        ret.form = {};
        var map = {
          "defaultuser": "defaultuser",
          "defaultzhihuiren": "zhr",
          "tmpSms": "sms",
          "tmpYoujian": "mail",
          "tmpRule": "spgz",
          "tmpEditable": "idx.eword",
          "tmpIDXEditable": "idx.eatt",
          "tmpIDXNew": "idx.uatt"
        };
        Object.keys(ret.detail).forEach(function (key) {
          var val = ret.detail[key]
          if (Array.isArray(val) && key !== 'defaultuser') {
            val = val.join("");
          }
          if (map[key] && ~map[key].indexOf(".")) {
            var prop1 = map[key].split(".")[0];
            var prop2 = map[key].split(".")[1];
            if (!ret.form[prop1]) {
              ret.form[prop1] = {}
            }
            ret.form[prop1][prop2] = val;
            return;
          }
          ret.form[map[key] || key] = val;
        });
        ret.form.flownum = ret.id;
        ret.form.nodename = ret.name;
        return ret;
      });
      var initModal = $ionicModal.fromTemplateUrl('app/webflow/split-selector.html', {
        scope: modalScope,
        animation: 'slide-in-right'
      });
      return $q(function (resolve, reject) {
        initModal.then(function (modal) {
          modalScope.modalCtrl.modal = modal;
          modalScope.modalCtrl.modal.show();
          modalScope.modalCtrl.cancel = function () {
            modalScope.modalCtrl.modal.hide();
            $scope.form.nextNode = null;
          };
          modalScope.modalCtrl.submit = function () {
            var ret = modalScope.modalCtrl.nodeList
              .filter(function (item) {
                return item.form.selected
              })
              .map(function (item) {
                return item.form
              });
            if (ret.length <= 0) {
              $imTimedInfo.show("请至少选择一个分支")
              return;
            }
            if (ret.some(function (item) {
                return item.defaultuser.length <= 0
              })) {
              $imTimedInfo.show("分支处理人不能为空")
              return;
            }
            $scope.form.strBxfz = {
              "items": ret
            };
            FormDataService.userCheckforSplit($scope.fileinfo, $scope.form).then(function (flag) {
              if (flag) {
                modalScope.modalCtrl.modal.hide().then(function () {
                  if (ret.length) {
                    resolve(ret);
                  } else {
                    reject(ret);
                  }
                });
              }
            })
          };
        });
      });
    };

    $scope.cancelSubmit = function () {
      $scope.submitModal.hide().then(function () {
        $scope.actionType = "submit";
        $scope.form.nextNode = null;
        $scope.submittitle = "提交";
      });

    };
    $scope.addLock = function () {
      return FormDataService.addLock($scope.fileinfo).then(function (data) {
        //console.info(data.msg);
      });
    };
    $scope.clearLock = function () {
      return FormDataService.clearLock($scope.fileinfo).then(function (data) {
        //console.info(data.msg);
      });
    };

    var closeLightApp = $rootScope.$on("$im.lightApp.beforeClose", function (event, until) {
      var promise = $injector.invoke($state.$current.self.onExit, $state.$current.self, $state.$current.locals.globals);
      until.setPromise(promise);
      closeLightApp();
    });
    $scope.$on('$destroy', function () {
      closeLightApp()
    })

    $scope.form.HAfilename = "";
    $scope.submitFormAuto = function () {
      //先提交手写批示
      $scope.submitHA()
        .then(function () {
          $scope.submitFormActions.submit();
        });
    };
    $scope.submitForm = function () {
      if ($scope.actionType == "submit" && !$scope.form.nextNode) {
        $imTimedInfo.show("请选择下一环节")
        return false;
      };
      if ($scope.actionType == "submit" &&
        $scope.form.nodeList[$scope.form.nextNode].submitto &&
        $scope.form.nodeList[$scope.form.nextNode].submitto.length <= 0) {
        $imTimedInfo.show("下一环节处理人不能为空")
        return false;
      };
      if ($scope.actionType == "submit" && $scope.form.nodeList[$scope.form.nextNode].notifyto && $scope.form.nodeList[$scope.form.nextNode].notifyto.toString() != "" &&
        $scope.form.nodeList[$scope.form.nextNode].notifymail == "" &&
        $scope.form.nodeList[$scope.form.nextNode].notifysms == "" &&
        $scope.form.nodeList[$scope.form.nextNode].notifytoread == ""
      ) {

        $imTimedInfo.show("必须选择一种通知方式")
        return false;
      };
      if ($scope.actionType == "goutongstart" &&
        $scope.form.goutongUser &&
        $scope.form.goutongUser.length <= 0) {

        $imTimedInfo.show("沟通处理人不能为空")
        return false;
      };
      if ($scope.actionType == "huiqian" &&
        $scope.form.hqdept &&
        $scope.form.hqdept.length <= 0) {

        $imTimedInfo.show("会签部门不能为空")
        return false;
      };
      if ($scope.form.nextNode && $scope.form.nodeList && ($scope.actionType == 'submit' || $scope.actionType == "hqfk" || $scope.actionType == "trash")) {
        if (~["SubmitBtn_sence9", "SubmitBtn_sence10"].indexOf($scope.form.nodeList[$scope.form.nextNode].returnSence)) {
          return $scope.mergeOrSplit($scope.form.nextNode)
        }
        if ($scope.form.nodeList[$scope.form.nextNode].type == "trash") {
          $imWebflowDelegate.triggerActionBtn($scope.form.nodeList[$scope.form.nextNode])
          return
        }
        if (~["SubmitBtn_sence8"].indexOf($scope.form.nodeList[$scope.form.nextNode].returnSence)) { //会签反馈hqfk
          var ha = $scope.HAInfo.data;
          var comments = $scope.form.comments;
          if (!ha && !comments && !$scope.hasLocalYjFile) {
            if ($scope.form.nodeList[$scope.form.nextNode].type == "hqfk") {
              $imTimedInfo.show("请填写反馈意见")
              return;
            } else {
              $scope.actionType = $scope.form.nodeList[$scope.form.nextNode].type
              $scope.openModal();
            }

          } else {
            if ($scope.form.nodeList[$scope.form.nextNode].type == "huiqian") {
              $scope.actionType = "huiqian"
              $scope.openModal();
            } else {
              $scope.submitHA().then(function () {
                $scope.submitFormActions.hqfk(true);
              })
            }
          }
          return;
        }
      }
      //先提交手写批示
      $scope.submitHA()
        .then(function () {
          if ($scope.actionType == "submit") {
            var returnSence = $scope.form.nodeList[$scope.form.nextNode].returnSence;
            // console.log(returnSence)
            if (~['SubmitBtn_sence6', 'SubmitBtn_sence7'].indexOf(returnSence) || "" == returnSence) {
              $scope.submitFormActions.submit();
            } else if ("SubmitBtn_sence9" == returnSence) {

            }
          } else {
            $scope.submitFormActions[$scope.actionType]();
          }
        }).then(function () {
          $rootScope.refresh = true;
        });
    };
    $scope.submitHA = function () {
      return $q.when(FormDataService.submitHA($scope.HAInfo)).then(function (data) {
        if (data.status == "success") {
          imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
          $rootScope.refresh = true;
          $scope.form.HAfilename = data.message;
        }
      });
    };
    $scope.submitFormActions = {
      afterSubmit: function (data) {
        if (data.status == "success") {
          imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
          $scope.clearLock()
            .then(function () {
              return $scope.submitModal.hide()
            })
            .then(function () {
              return $ionicPopup.alert({
                template: data.message
              })
            })
            .then(function () {
              //  $rootScope.refresh = true;
              //$state.go("tab.home.todo");
              $imHistory.backToList();
            });
        } else if (data.status == "fail") {
          $imTimedInfo.show("失败:" + data.message)
          // $rootScope.refresh = true;
          // $state.go("tab.home.todo");
          $imHistory.backToList();
        };
      },
      submit: function () {
        var wtuser = [];
        if ($scope.form.nextNode) {
          if ($scope.form.nodeList[$scope.form.nextNode].submitto) {
            wtuser = $scope.form.nodeList[$scope.form.nextNode].submitto
          }
        } else {
          if ($scope.form.nextDealer) {
            wtuser = $scope.form.nextDealer;
          }
        }
        var wthjname = "";
        var hjcode = "";
        if ($scope.form.nextNode) { //如果数组取最后一个值
          hjcode = $scope.form.nodeList[$scope.form.nextNode].id;
          if (angular.isArray(hjcode)) { //如果数组取最后一个值
            hjcode = hjcode[hjcode.length];
          }
        }
        var checkpara = {
          "action": "submit",
          "user": wtuser,
          "dbpath": $scope.fileinfo.dbpath,
          "flowid": $scope.form.flowunid,
          "protocol": $scope.fileinfo.protocol,
          "domain": $scope.fileinfo.domain,
          "hjcode": hjcode,
          "unid": $scope.fileinfo.unid,
          "drspgz": $scope.form.nextNode && $scope.form.nodeList[$scope.form.nextNode].strSpgz ? $scope.form.nodeList[$scope.form.nextNode].strSpgz : ""
        }
        FormDataService.userCheck(checkpara).then(function (data) {
          if (data) {
            $scope.form.postFileds = $scope.dealFormdata("submit");
            $scope.form.idxfiles = $scope.formData.idxfiles;
            $q.when(FormDataService.submit($scope.fileinfo, $scope.form)).then(function (data) {
              if (data.status == "invalid") {
                if (data.invalidType == "nextNode") {
                  $ionicPopup.alert({
                    template: "失败:" + data.message
                  }).then(function () {
                    $scope.isProcessing = false
                    $ionicLoading.hide()
                  })
                }
              } else if (data.status == "success") {
                imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                $scope.clearLock()
                  .then(function () {
                    return $scope.submitModal.hide()
                  })
                  .then(function () {
                    //判断如果最后一个字符为感叹号则去掉
                    if (data.message.substring(data.message.length - 1, data.message.length) === "!") {
                      data.message = data.message.substring(0, data.message.length - 1);
                    }
                    if (data.message == "" || !data.message) {
                      return $imTimedInfo.show("处理成功");
                    } else if (data.message == "文件流转处理已结束") {
                      return $imTimedInfo.show(data.message);
                    } else {
                      return $ionicPopup.alert({
                        template: data.message
                      }).then(function () {
                        $scope.isProcessing = false
                        $ionicLoading.hide()
                      })
                    }
                  })
                  .then(function () {
                    $timeout(function () {
                      $scope.isProcessing = false;
                      $ionicLoading.hide()
                    }, 100)
                    $imHistory.backToList();
                  });
              } else if (data.status == "fail") {
                $ionicPopup.alert({
                  template: "失败:" + data.message
                }).then(function () {
                  $scope.isProcessing = false
                  $ionicLoading.hide()
                  $imHistory.backToList();
                })
              };
            }, function () {
              $ionicLoading.hide();
              $scope.isProcessing = false
            });
          } else {
            $ionicLoading.hide();
            $scope.isProcessing = false
          }
        }, function () {
          $ionicLoading.hide();
          $scope.isProcessing = false
        })

      },
      forward: function () {
        if (!$scope.form.forwardUser || $scope.form.forwardUser.length == 0) {
          $imTimedInfo.show('请选择处理人')
          return;
        }
        var goutingUsers = $scope.form.forwardUser
        $scope.form['HAInfo'] = $scope.HAInfo;
        var checkpara = {
          "canself": "no",
          "curuser": $scope.context.userinfo.fullname,
          "action": "zhuanban",
          "user": $scope.form.forwardUser,
          "protocol": $scope.fileinfo.protocol,
          "dbpath": $scope.fileinfo.dbpath,
          "flowid": $scope.form.flowunid,
          "domain": $scope.fileinfo.domain,
          "hjcode": "",
          "unid": $scope.fileinfo.unid,
        }
        FormDataService.userCheck(checkpara).then(function (data) {
          if (data) {
            $scope.form.idxfiles = $scope.formData.idxfiles;
            FormDataService.forward($scope.fileinfo, $scope.form).then(function (data) {
              if (data.msg != "完成审批") {
                data.msg = data.msg.substring(0, data.msg.length - 1);
              }
              $imTimedInfo.show(data.msg).then(function () {
                if (data.type == "success") {
                  imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                  // $rootScope.refresh = true;
                  //$state.go("tab.home.todo");
                  $imHistory.backToList();
                };
              });
            });
          }
        })
      },
      appenduser: function () {
        if (!$scope.form.forwardUser || $scope.form.forwardUser.length == 0) {
          $imTimedInfo.show('请选择处理人')
          return;
        }
        var goutingUsers = $scope.form.forwardUser
        $scope.form['HAInfo'] = $scope.HAInfo;
        var checkpara = {
          "canself": "no",
          "curuser": $scope.context.userinfo.fullname,
          "action": "appenduser",
          "user": $scope.form.forwardUser,
          "protocol": $scope.fileinfo.protocol,
          "dbpath": $scope.fileinfo.dbpath,
          "flowid": $scope.form.flowunid,
          "domain": $scope.fileinfo.domain,
          "hjcode": "",
          "unid": $scope.fileinfo.unid
        }
        FormDataService.userCheck(checkpara).then(function (data) {
          if (data) {
            $scope.form.idxfiles = $scope.formData.idxfiles;
            FormDataService.appenduser($scope.fileinfo, $scope.form).then(function (data) {
              $imTimedInfo.show(data.msg).then(function () {
                if (data.type == "success") {
                  imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                  $imHistory.backToList();
                };
              });
            });
          }
        })
      },
      forwardwt: function () {
        if (!$scope.form.forwardUser || $scope.form.forwardUser.length == 0) {
          $imTimedInfo.show('请选择处理人')
          return;
        }
        var goutingUsers = $scope.form.forwardUser
        $scope.form['HAInfo'] = $scope.HAInfo;
        var checkpara = {
          "canself": "no",
          "curuser": $scope.context.userinfo.fullname,
          "action": "zhuanbanwt",
          "user": $scope.form.forwardUser,
          "protocol": $scope.fileinfo.protocol,
          "dbpath": $scope.fileinfo.dbpath,
          "flowid": $scope.form.flowunid,
          "domain": $scope.fileinfo.domain,
          "hjcode": "",
          "unid": $scope.fileinfo.unid
        }
        FormDataService.userCheck(checkpara).then(function (data) {
          if (data) {
            FormDataService.forward($scope.fileinfo, angular.extend($scope.form, {
              "forwardType": "forwardtowt"
            })).then(function (data) {
              if (data.msg != "完成审批") {
                data.msg = data.msg.substring(0, data.msg.length - 1);
              }
              $imTimedInfo.show(data.msg).then(function () {
                if (data.type == "success") {
                  imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                  $imHistory.backToList();
                };
              });
            });
          }
        })
      },
      bohui: function () {
        if (!$scope.form.denyNodeList[$scope.form.nextNode]) {
          $imTimedInfo.show('请选择驳回环节')
          return;
        }
        var user = $scope.form.denyNodeList[$scope.form.nextNode].strDealer ? $scope.form.denyNodeList[$scope.form.nextNode].strDealer : $scope.form.denyNodeList[$scope.form.nextNode].users
        var checkpara = {
          "action": "deny",
          "user": user,
          "protocol": $scope.fileinfo.protocol,
          "dbpath": $scope.fileinfo.dbpath,
          "flowid": $scope.form.flowunid,
          "domain": $scope.fileinfo.domain,
          "hjcode": $scope.form.nextNode,
          "unid": $scope.fileinfo.unid,
        }
        FormDataService.userCheck(checkpara).then(function (data) {
          if (data) {
            $q.when(FormDataService.bohui($scope.fileinfo, $scope.form)).then(function (data) {
              $imTimedInfo.show(data.msg).then(function () {
                if (data.type == "success") {
                  imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                  $imHistory.backToList();
                };
              });
            });
          }
        })

      },
      goutongstart: function () {
        //zhangweiguo修改
        var goutingUsers = $scope.form.goutongUser || [];
        if (goutingUsers.length <= 0) {
          return $imTimedInfo.show("沟通处理人不能为空")
        }
        var checkpara = {
          "canself": "no",
          "curuser": $scope.context.userinfo.fullname,
          "domain": $scope.fileinfo.domain,
          "action": "goutong",
          "user": goutingUsers,
          "protocol": $scope.fileinfo.protocol,
          "dbpath": $scope.fileinfo.dbpath,
          "flowid": $scope.form.flowunid,
          "hjcode": "",
          "unid": $scope.fileinfo.unid
        }
        FormDataService.userCheck(checkpara).then(function (data) {
          if (!data) {
            return
          }
          $scope.form['HAInfo'] = $scope.HAInfo;
          $scope.form.idxfiles = $scope.formData.idxfiles;
          FormDataService.goutongstart($scope.fileinfo, $scope.form).then(function (data) {
            if (data.msg != "完成审批") {
              data.msg = data.msg.substring(0, data.msg.length - 1);
            }
            $imTimedInfo.show(data.msg).then(function () {
              if (data.type == "success") {
                imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                //   $rootScope.refresh = true;
                //$state.go("tab.home.todo");
                $imHistory.backToList();
              };
            });
          });
        })
      },
      goutongsubmit: function () {
        $scope.form['HAInfo'] = $scope.HAInfo;
        $scope.form.idxfiles = $scope.formData.idxfiles;
        FormDataService.goutongsubmit($scope.fileinfo, $scope.form)
          .then(function (data) {
            if (data.msg != "沟通已完成") {
              data.msg = data.msg.substring(0, data.msg.length - 1);
            }
            $imTimedInfo.show(data.msg).then(function () {
              if (data.type == "success") {
                imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                $rootScope.refresh = true;
                //$state.go("tab.home.todo");
                $imHistory.backToList();
              };
            });
          });
      },
      zhihui: function () {
        if (!$scope.form.zhihuiUser || $scope.form.zhihuiUser.length == 0) {
          $imTimedInfo.show('请选择知会人')
          return;
        }
        if (!($scope.form.mail || $scope.form.mail || $scope.form.toread)) {
          $imTimedInfo.show('请选择知会方式')
          return;
        }
        var checkpara = {
          "action": "zhihui",
          "user": $scope.form.forwardUser,
          "protocol": $scope.fileinfo.protocol,
          "dbpath": $scope.fileinfo.dbpath,
          "flowid": $scope.form.flowunid,
          "domain": $scope.fileinfo.domain,
          "hjcode": "",
          "unid": $scope.fileinfo.unid,
        }
        FormDataService.userCheck(checkpara).then(function (data) {
          if (data) {
            FormDataService.zhihui($scope.fileinfo, $scope.form).then(function (data) {
              if (data.msg != "完成审批") {
                data.msg = data.msg.substring(0, data.msg.length - 1);
              }
              data.msg = data.msg.replace("知会", $scope.zhfilter.zhihuiText); //将反馈信息里的知会换成配置的按钮
              $imTimedInfo.show(data.msg).then(function () {
                if (data.type == "success") {
                  imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                  $imHistory.backToList();
                };
              });
            });
          }
        })

      },
      yuebi: function () {
           FormDataService.getYuebiInfo($scope.fileinfo, $scope.form)
          .then(function (yuebiInfo) {
            if (yuebiInfo.length == 1) {
              // return FormDataService.yuebi($scope.fileinfo, $scope.form, yuebiInfo);
              return yuebiInfo;
            } else if (yuebiInfo.length > 1) {
              return $scope.selectYuebi(yuebiInfo);
            }
          }).then(function (data) {
            return FormDataService.yuebi($scope.fileinfo, $scope.form, data)
          })
          .then(function (data) {
            $imTimedInfo.show(data.msg).then(function () {
              if (data.type == "success") {
                imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                //$rootScope.refresh = true;
                //$state.go("tab.home.todo");
                $imHistory.backToList();
                $rootScope.refresh = $stateParams.id;
              };
            });
          });
      },
      zhijieyiyue: function () {
          $scope.form.comments = "已阅"
          FormDataService.getYuebiInfo($scope.fileinfo, $scope.form)
          .then(function (yuebiInfo) {
            if (yuebiInfo.length == 1) {
              // return FormDataService.yuebi($scope.fileinfo, $scope.form, yuebiInfo);
              return yuebiInfo;
            } else if (yuebiInfo.length > 1) {
              return $scope.selectYuebi(yuebiInfo);
            }
          }).then(function (data) {
            return FormDataService.yuebi($scope.fileinfo, $scope.form, data)
          })
          .then(function (data) {
            $imTimedInfo.show(data.msg).then(function () {
              if (data.type == "success") {
                imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                //$rootScope.refresh = true;
                //$state.go("tab.home.todo");
                $imHistory.backToList();
                $rootScope.refresh = $stateParams.id;
              };
            });
          });
      },
      huiqian: function () {
        var hqdpt = $scope.form.hqdept || [];
        var hqpsn = $scope.form.hqperson || [];
        var key_showHQDepUser = $scope.form.flowconfig.key_showHQDepUser;
        var key_hideHQDep = $scope.form.flowconfig.key_hideHQDep;
        if (key_showHQDepUser == 1 && key_hideHQDep == 1 && hqpsn.length === 0) {
          return $imTimedInfo.show("会签人员不能为空")
        }
        if (key_showHQDepUser == 0 && key_hideHQDep == 0 && hqdpt.length === 0) {
          return $imTimedInfo.show("会签部门不能为空")
        }
        if (key_showHQDepUser == 1 && key_hideHQDep == 0 && hqdpt.length == 0 && hqpsn.length == 0) {
          if ($scope.curinfo[0].stat == "起草") {
            return $imTimedInfo.show("会签部门不能为空")
          }
          return $imTimedInfo.show("会签部门(人员)不能为空")
        }
        var hqtype = $scope.form.hqtype
        $scope.form['HAInfo'] = $scope.HAInfo;
        $scope.form.idxfiles = $scope.formData.idxfiles;
        $scope.form.postFileds = $scope.dealFormdata("submit");
        FormDataService.hqstart($scope.fileinfo, $scope.form, "huiqian", hqtype).then(function (data) {
          data.msg = FormDataService.formatHqMsg(data, "huiqian");
          var alertPopup = $ionicPopup.alert({
            template: data.msg
          });
          alertPopup.then(function (res) {
            if (data.type == "success") {
              imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
              $imHistory.backToList();
            };
          });
        });
      },

      jiaqian: function () {
        var hqdpt = $scope.form.hqdept || [];
        var hqpsn = $scope.form.hqperson || [];
        if (hqdpt.length <= 0 && hqpsn.length <= 0) {
          return $imTimedInfo.show("加签部门(人员)不能为空")
        }
        var hqtype = $scope.form.hqtype

        $scope.form['HAInfo'] = $scope.HAInfo;
        $scope.form.idxfiles = $scope.formData.idxfiles;
        FormDataService.hqstart($scope.fileinfo, $scope.form, "jiaqian", hqtype).then(function (data) {
          data.msg = FormDataService.formatHqMsg(data, "jiaqian");
          var alertPopup = $ionicPopup.alert({
            template: data.msg
          });
          alertPopup.then(function (res) {
            if (data.type == "success") {
              imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
              $imHistory.backToList();
            };
          });
        });
      },
      jianqian: function () {
        $scope.form['HAInfo'] = $scope.HAInfo;
        department = $filter('filter')($scope.form.jqdept, {
          checked: true
        });
        person = $filter('filter')($scope.form.jqperson, {
          checked: true
        });
        if (department.length <= 0 && person.length <= 0) {
          $imTimedInfo.show("请选择减签部门或个人").then(function () {
            return
          });
        } else {
          $scope.form.idxfiles = $scope.formData.idxfiles;
          FormDataService.hqstart($scope.fileinfo, $scope.form, "jianqian", "", $filter).then(function (data) {
            data.msg = FormDataService.formatHqMsg(data, "jianqian");
            var alertPopup = $ionicPopup.alert({
              template: data.msg
            });
            alertPopup.then(function (res) {
              if (data.type == "success") {
                imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                $imHistory.backToList();
              };
            });
          });
        }
      },
      hqfk: function (depfk) {
        var ha = $scope.HAInfo.data; //会签反馈
        var comments = $scope.form.comments;
        var fkYjIsExist = ha || comments || $scope.hasLocalYjFile
        $scope.form['HAInfo'] = $scope.HAInfo;
        if (depfk) {
          if (!fkYjIsExist && !noyjAction) {
            $imTimedInfo.show("请填写反馈意见")
            return;
          }
          var key_SelectFKJY = $scope.formData.flowconfig.key_SelectFKJY;
          if (key_SelectFKJY === "0") $scope.form.seletFKYJ = [];
          if (key_SelectFKJY === "1" && $scope.form.seletFKYJ.length === 0) {
            $imTimedInfo.show("请选择反馈意见")
            return;
          }
          $scope.form.idxfiles = $scope.formData.idxfiles;
          FormDataService.hqfk($scope.fileinfo, $scope.form, depfk).then(function (data) {
            if (data.msg != "会签反馈已完成") {
              data.msg = data.msg.substring(0, data.msg.length - 1)

            };
            $imTimedInfo.show(data.msg == "" ? "反馈成功" : data.msg).then(function () {
              if (data.type == "success") {
                imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                $rootScope.refresh = $stateParams.id;
                $imHistory.backToList();
              }
            });
          })
        }

        if (!depfk) {
          checkYj($scope.formData.power.hqyjvalidatecfg).then(function (res) {
            if (res[0]) {
              FormDataService.hqfk($scope.fileinfo, $scope.form, depfk).then(function (data) {
                if (data.msg != "会签反馈已完成") {
                  data.msg = data.msg.substring(0, data.msg.length - 1)

                };
                $imTimedInfo.show(data.msg == "" ? "反馈成功" : data.msg).then(function () {
                  if (data.type == "success") {
                    imLocalStorage.removeItem('comments' + $stateParams.id, $scope.form.comments)
                    $rootScope.refresh = $stateParams.id;
                    $imHistory.backToList();
                  }
                });
              })
            } else {
              $scope.commentModal.hide();
            }
          })

        }
      },
      remind: function () {
        $scope.form.selectRemindUserAll = $scope.form.selectRemindUser.concat($scope.form.selectRemindHqUser, $scope.form.selectRemindHqbmUser)
        if ($scope.form.selectRemindUserAll.length < 1) {
          $imTimedInfo.show('请选择提醒处理人')
          return;
        }
        if (!$scope.form.remindContent) {
          $imTimedInfo.show('请输入提醒内容')
          return;
        }
        FormDataService.remind($scope.fileinfo, $scope.form, $scope.form.selectRemindUserAll).then(function (data) {
          if (data.type == 'fail') {
            $ionicPopup.alert({
              template: data.msg
            })
            return;
          } else if (data.type == 'success') {
            $imTimedInfo.show(data.msg).then(function () {
              $imHistory.backToList();
            });
          }
        });
      }
    }

    $scope.chehui = function () {
      return FormDataService.chehui($scope.fileinfo).then(function (data) {
        data.msg = data.msg.replace("！", "");
        if (data.type == "success") {
          $imTimedInfo.show(data.msg)
          $imHistory.backToList();
        } else if (data.type == "fail") {
          $ionicPopup.alert({
            template: "失败:" + data.msg
          })
        }
      });
    };
    $scope.guanzhu = function (action) {
      var param = angular.extend($scope.fileinfo, {
        action: action
      });
      return FormDataService.guanzhu(param).then(function (data) {
        if (data.type == "success") {
          action == "del" ? $rootScope.refreshgz = $stateParams.id : "";
          return $imTimedInfo.show(action == 'add' ? '关注成功' : '取消关注成功')
        }
      });
    };
    $scope.selectYuebi = function (yuebiInfo) {
      var modalScope = $scope.$new();
      modalScope.modalCtrl = {
        data: yuebiInfo
      };
      var initModal = $ionicModal.fromTemplateUrl('app/webflow/yuebi-selector.html', {
        scope: modalScope,
        animation: 'slide-in-right'
      });
      return $q(function (resolve, reject) {
        initModal.then(function (modal) {
          modalScope.modalCtrl.modal = modal;
          modalScope.modalCtrl.modal.show();
          modalScope.modalCtrl.cancel = function () {
            modalScope.modalCtrl.modal.hide();
          };
          modalScope.modalCtrl.submit = function () {
            var ret = modalScope.modalCtrl.data.filter(function (item) {
              return item.checked
            });
            modalScope.modalCtrl.modal.hide().then(function () {
              if (ret.length) {
                resolve(ret);
              } else {
                reject(ret);
              }
            });
          };
        });
      });
    };
    $scope.$on('$stateChangeStart', function removeAllDialog(event, toState, toParams, fromState, fromParams) {
      if (fromState.name == "webflow") {
        $scope.commentModal.remove();
        $scope.submitModal.remove();
        if ($scope.HAModal) {
          $scope.HAModal.remove();
        }

      }
    });
    $scope.selectPeople = function (item) {
      $scope.bindTo = item;
      selectService.init('app/contact/select.html', $scope).then(function (modal) {
        modal.show();
      });
    };
    $scope.form.yjatt = {
      "name": "",
      "base64": ""
    }
    $scope.m = {};
    $scope.m.media = null;
    $scope.RecordInfo = {
      isRecording: false,
      refGesture: null,
      refPopup: null,
      wavFullPath: "",
      m4aFullPath: "",
      base64: "",
      current: 0,
      duration: 0,
      timeStart: null,
      time: ''
    }
    $scope.m4asrc = 'cdvfile://localhost/temporary/record.m4a';
    var timerEclipse;
    var timeUse = 0;

    $scope.Recordcancel = function () {
      $scope.Record('cancel')
    }
    $scope.androidrecordfailtips = function () {
      $ionicPopup.alert({
        title: "无法录音",
        template: "请在系统设置中打开允许APP访问麦克风的开关,并重新启动APP"
      })
    }
    $scope.mediaError = function (err) {
      $scope.RecordInfo.isRecording = false;
      $scope.RecordInfo.wavFullPath = "";
      $scope.RecordInfo.m4aFullPath = "";
      $ionicLoading.hide();
      if (cordova.platformId == "ios") {

        var _tmpconfirm = $ionicPopup.confirm({
          title: '无法录音',
          template: '请在系统设置中打开允许APP访问麦克风的开关',
          cancelText: '取消',
          okText: '立即开启'
        }).then(function (flag) {
          if (flag) {
            window.open("app-settings:", "_system")
          }
        })
      } else {
        $scope.RecordInfo.android6error = true
        $scope.androidrecordfailtips()
      }
      if ($scope.RecordInfo.refPopup) {
        $scope.RecordInfo.refPopup.close();
      }
      //$scope.Record('cancel')
    }
    $scope.mediaSuccess = function () {
      console.log("success")
    }
    $scope.Record = function (action) {
        if (action == "start") {
          if ($scope.hasYjFileinfo) {
            $ionicPopup.alert({
              template: "您已上传意见附件，不可再上传语音意见"
            });
            return;
          }
          $scope.wavsrc = window._tempFs.root.toURL().replace("file://", "") + "record.wav";
          try {
            if (cordova.platformId == "ios") {
              $scope.m.media = new Media($scope.wavsrc, $scope.mediaSuccess, $scope.mediaError);
            } else {
              $scope.m.media = new Media($scope.m4asrc, $scope.mediaSuccess, $scope.mediaError, function () {});
            }
            $scope.m.media.startRecord();
          } catch (e) {
            alert("catch")
          }
          $scope.RecordInfo.isRecording = true;
          $scope.RecordInfo.timeStart = new Date();
          $ionicLoading.show({
            template: '<div class="luyin-size-96"><i class="icon indi-luyin-1"></i><i class="icon indi-luyin-2"></i><i class="icon indi-luyin-3"></i><i class="icon indi-luyin-4"></i></div>手指上滑，取消发送',
            noBackdrop: true
          });
          //按住按钮的时候不能用swipeup捕获上滑动作，此时认为是拖拽
          if (!$scope.RecordInfo.refGesture) {
            $scope.RecordInfo.refGesture = ionic.EventController.onGesture("dragup", $scope.Recordcancel, document);
            window.resolveLocalFileSystemURL($scope.m4asrc, function (fileEntry) {
              fileEntry.remove();
            });
          }
          $scope.RecordInfo.wavFullPath = "";
          $scope.RecordInfo.m4aFullPath = "";

        } else if (action == "finish") {
          if (!$scope.RecordInfo.isRecording || $scope.RecordInfo.android6error) {
            console.log("return")
            return
          }
          $scope.RecordInfo.isRecording = false;
          $ionicLoading.hide();
          $scope.m.media.stopRecord();
          if (cordova.platformId == "ios") {
            $scope.RecordInfo.wavFullPath = $scope.wavsrc;
          } else {
            $scope.RecordInfo.wavFullPath = $scope.m4asrc;
          }
          var timeEnd = new Date();
          var dutime = parseInt((timeEnd.getTime() - $scope.RecordInfo.timeStart.getTime()) / 1000);
          if (dutime && dutime > 0) {
            $scope.RecordInfo.duration = dutime;
            var sec = dutime % 60;
            var min = (dutime - sec) / 60;
            $scope.RecordInfo.time = min ? (min + "'" + sec + '"') : sec + '"';
          }
          if ($scope.RecordInfo.refGesture) {
            $scope.RecordInfo.refGesture.off("dragup", $scope.Recordcancel);
            $scope.RecordInfo.refGesture = null
          }
          $scope.m.media.release();
          window.resolveLocalFileSystemURL($scope.RecordInfo.wavFullPath, function (fileEntry) {
            fileEntry.file(function (file) {
              if (file.size < 33) {
                $scope.androidrecordfailtips()
                $scope.Record('cancel')
              } else {
                $scope.Record('show');
              }
            });
          }, function (err) {
            if (cordova.platformId != "ios") {
              $scope.RecordInfo.isRecording = false;
              $scope.RecordInfo.wavFullPath = "";
              $scope.RecordInfo.m4aFullPath = "";
              $scope.androidrecordfailtips()
            } else {
              $scope.Record('show');
            }
          });
      } else if (action == "cancel") {
        $scope.RecordInfo.isRecording = false;
        $scope.RecordInfo.wavFullPath = "";
        $scope.RecordInfo.m4aFullPath = "";
        $scope.RecordInfo.duration = 0;
        $scope.RecordInfo.time = "";
        $scope.RecordInfo.current = 0;
        $scope.form.yjatt.name = "";
        $scope.form.yjatt.base64 = "";
        $ionicLoading.hide();
        //取消监听
        if ($scope.m.media) {
          $scope.m.media.stopRecord();
          $scope.m.media.release()
        }
        if ($scope.RecordInfo.refGesture) {
          $scope.RecordInfo.refGesture.off("dragup", $scope.Recordcancel);
          $scope.RecordInfo.refGesture = null
        }
        if (cordova.platformId == "ios") {
          window.resolveLocalFileSystemURL($scope.wavsrc, function (fileEntry) {
            fileEntry.remove();
          });
        } else {
          window.resolveLocalFileSystemURL($scope.m4asrc, function (fileEntry) {
            fileEntry.remove();
          });
        }
      } else if (action == "show") {
        $scope.RecordInfo.refPopup = $ionicPopup.show({
          scope: $scope,
          cssClass: "voice",
          templateUrl: "app/webflow/recordattitude.html"
        });
      } else if (action == "remove") {
        var _tmpConfirm = $ionicPopup.confirm({
          title: '消息提示',
          template: '您将要删除语音意见，是否确定？',
          cancelText: '取消',
          okText: '确定'
        }).then(function (falg) {
          if (falg) {
            $scope.RecordInfo.wavFullPath = "";
            $scope.RecordInfo.m4aFullPath = "";
            $scope.RecordInfo.duration = 0;
            $scope.RecordInfo.time = "";
            $scope.RecordInfo.current = 0;
            $scope.form.yjatt.name = "";
            $scope.form.yjatt.base64 = "";
            if ($scope.RecordInfo.refPopup)
              $scope.RecordInfo.refPopup.close();
            if (cordova.platformId == "ios") {
              window.resolveLocalFileSystemURL($scope.wavsrc, function (fileEntry) {
                fileEntry.remove();
              });
            } else {
              window.resolveLocalFileSystemURL($scope.m4asrc, function (fileEntry) {
                fileEntry.remove();
              });
            }
          } else {

          }
        })
      } else {}
    };
    $scope.HAInfo = {
      protocol: $stateParams.protocol,
      domain: $stateParams.domain,
      dbpath: $stateParams.path,
      unid: $stateParams.id,
      data: ""
    };
    $scope.openHAModal = function (curActiveModal) {
      if (!$scope.HAModal) {
        $ionicModal.fromTemplateUrl('HAModal.html', {
          scope: $scope,
          animation: 'slide-in-right'
        }).then(function (modal) {
          $scope.HAModal = modal;
          $ionicSlideBoxDelegate.update();
          $scope.HAModal.show();
        });
      } else {
        $ionicSlideBoxDelegate.update();
        $scope.HAModal.show();
      }
      $scope.lastActiveModal = curActiveModal
      if (curActiveModal && $scope[curActiveModal]) {
        $scope[curActiveModal].hide()
      }
    };
    $scope.closeHAModal = function () {
      $scope.HAModal.hide();
      if ($scope.lastActiveModal && $scope[$scope.lastActiveModal]) {
        $scope[$scope.lastActiveModal].show()
      }
      if ($scope.HAInfo.data != "") {
        $scope.hasHAinfo = true;
      } else {
        $scope.hasHAinfo = false;
      }
    }

    //知会记录部分
    $scope.getZhiHuiJiLu = function () {
      //判断是否已经加载过知会记录
      if ($scope.zhjiluload) return;
      //读取知会记录
      FormDataService.zhihuijilu($scope.fileinfo).then(function (data) {
        if (data.constructor == Array) {
          $scope.zhjiluTotal = data;
          $scope.zhjiluCount = $scope.zhjiluTotal;
          $scope.tabsInfo.notify.count = $scope.zhjiluCount.length;

          $scope.zhjilu = [];
          $scope.suzhu = [];
          angular.forEach(data, function (item, index) {
            item.fahead = ContactService.getAvatar(item.from);
            //item.shouhead = ContactService.getAvatar(item.to);
            item.unique = item.from + item.fromtime;
            $scope.suzhu.push(item.unique);
          });

          for (var i = 0, len = data.length; i < len; i++) {
            $scope.zhjilu.push(data[i]);
          }
          
          angular.forEach(data, function (item) {
            item.ren = {};
            item.ren.attitude = item.attitude;
            item.ren.isread = item.isread;
            item.ren.to = item.to;
            item.ren.shouhead = item.shouhead;
            item.ren.readtime = item.readtime;
            item.ren.replytime = item.replytime;
            item.ren.zhihuibtn = item.zhihuibutton;
            item.ren.replybtn = item.banbibutton;
          });
          angular.forEach($scope.zhjilu, function (item) {
            item.beizhihui = [];
            angular.forEach(data, function (i) {
              if (i.unique == item.unique) {
                item.beizhihui.push(i.ren);
              }
            })
            item.isshow = false;
            item.yiyue = [];
            item.weiyue = [];
            item.yuebi = [];
            item.replybtn = "阅毕"
            if (item.beizhihui && item.beizhihui[0] && item.beizhihui[0].replybtn) {
              item.replybtn = item.beizhihui[0].replybtn
            }
            angular.forEach(item.beizhihui, function (j) {
              if (j.isread == true) {
                if (j.attitude == undefined) {
                  j.attitude = "已阅"
                }
                if (j.replytime) {
                  item.yuebi.push(j)
                } else {
                  item.yiyue.push(j);
                }
              } else {
                if (j.attitude) {
                  item.yiyue.push(j);
                } else {
                  item.weiyue.push(j);
                }
              }
            });
            angular.forEach(item.yiyue, function (y) {
              y.shouhead = ContactService.getAvatar(y.to);
            })

            angular.forEach(item.yuebi, function (y) {
              y.shouhead = ContactService.getAvatar(y.to);
            })
          });

          var result = [];
          $scope.zhjilu = [];
          for (var i = 0, len = $scope.suzhu.length, item; i < len; i++) {
            item = $scope.suzhu[i];
            if (result.indexOf(item) < 0) {
              result[result.length] = item;
              $scope.zhjilu.push(data[i]);
            }
          }

          var zhjlCustom = "";
          var zhutil = {
            setzhjl: function (zhihuijilu) {
              zhjlCustom = zhihuijilu;
            }
          }
          $scope.$emit("$im.webflow.zhihuijilu.datafilter", $scope.zhjilu, zhutil)
          if (zhjlCustom) {
            $scope.zhjilu = zhjlCustom
          }

          $scope.zhjiluTotalCopy = [];
          $scope.zhjiluCopy = angular.copy($scope.zhjilu);
          if (zhjlCustom) {
            $scope.zhjiluTotalCopy = $scope.zhjilu;
          } else {
            for (var i = 0, len = $scope.zhjiluTotal.length; i < len; i++) {
              $scope.zhjiluTotalCopy.push($scope.zhjiluTotal[i]);
            }
            angular.forEach($scope.zhjiluCopy, function (item, index) {
              item.fahead = $scope.zhjilu[index].fahead;
              angular.forEach(item.yiyue, function (yiyueItem, i) {
                yiyueItem.shouhead = $scope.zhjilu[index].yiyue[i].shouhead
              })
              angular.forEach(item.yuebi, function (yuebiItem, i) {
                yuebiItem.shouhead = $scope.zhjilu[index].yuebi[i].shouhead
              })
            })
          }

          if ($scope.zhjilu.length != 0) {
            $scope.zhjilu[0].isshow = true;
            $scope.zhjiluCopy[0].isshow = true;
          }

          //设置为true,标识知会记录已经加载过
          $scope.zhjiluload = true;
        }
      });
    };

    $scope.zhjlisshow = function (index) {
      angular.forEach($scope.zhjilu, function (item, i) {
        if (i == index) {
          if (item.isshow == true) {
            item.isshow = false
          } else {
            item.isshow = true
          }
        }
      });
      $ionicScrollDelegate.resize();
    }

    $scope.addOneCyy = function () {
      if ($scope.form.comments == "" || $scope.form.comments == undefined) {
        $imTimedInfo.show("请输入添加内容")
        return
      }
      var ise = false;
      $scope.forbidHandel = {
        'pointer-events': 'none'
      };
      angular.forEach($scope.myCyy, function (item) {
        if ((item.content).trim() == ($scope.form.comments).trim()) {


          ise = true
        }
      });
      angular.forEach($scope.defCyy, function (item) {
        if ((item.content).trim() == ($scope.form.comments).trim()) {
          ise = true
        }
      });
      if (ise == true) {
        $imTimedInfo.show("常用语已存在，请勿重复添加");
        $scope.forbidHandel = {
          'pointer-events': ''
        };
        return
      }
      CyyService.cyyAdd($scope.fileinfo, $scope.form.comments).then(function (data) {
        if (data.type == "success") {
          $scope.getcyy();
        }
      });
    }
    $scope.imalert = function () {
      $ionicPopup.alert({
        template: "无阅读权限"
      })
    }
    $scope.changeBhhj = function () {
      $scope.form.denyNodeList.forEach(function (item, index) {
        if (index >= $scope.form.nextNode) {
          item.type = ""
        }
      })
      $scope.reload = true
      $timeout(function () {
        delete $scope.reload
      });
      $ionicScrollDelegate.resize();
    }
    $scope.changeBhType = function () {
      $ionicScrollDelegate.resize();
    }

    $scope.bhClick = function () {
      var nxtdealer = $scope.form.denyNodeList[$scope.form.nextNode].strDealer
      var valueFormCustom = "";
      var util = {
        setUsers: function (user) {
          valueFormCustom = user;
        }
      }
      $scope.$emit("$im.webflow.userDenyTo.change", nxtdealer, util)
      if (valueFormCustom) {
        $scope.form.denyNodeList[$scope.form.nextNode].strDealer = valueFormCustom
      }
    }
    $scope.checkAllCoverYj = function () {
      if ($scope.form.coverYjKey.length == $scope.formData.selectCoverYj.submit.length) {
        $scope.form.coverYjKey = [];
      } else {
        $scope.form.coverYjKey = $scope.formData.selectCoverYj.submit.map(function (item) {
          return item.yjkey
        })
      }
    }
    $scope.checkAllseletFKYJ = function () {
      if ($scope.form.seletFKYJ.length == $scope.form.depHKYJs.length && $scope.form.seletYJTBD.length == $scope.form.depHKYJs.length) {
        $scope.form.seletFKYJ = [];
        $scope.form.seletYJTBD = []
      } else {
        $scope.form.seletYJTBD = $scope.form.depHKYJs.map(function (item) {
          return item.yjindex;
        })
        $scope.form.seletFKYJ = $scope.form.depHKYJs.map(function (item) {
          return item.yjindex;
        })
      }
    }
    //选中上审批单，自动勾选审批意见
    $scope.seletYJTBDChange = function (checked, yjindex) {
      if (checked) {
        $scope.form.seletFKYJ.push(yjindex);       
      } else {
        $scope.form.seletFKYJ = $scope.form.seletFKYJ.filter(function (item) {
          return yjindex != item;
        })
      }
    }
    $scope.checkAllFile = function(type) {
      if(type=='Att'){//选普通附件
        if ($scope.form.arySelectAttFileName.length == $scope.fjlength+$scope.zhengwen.length) {
          $scope.form.arySelectAttFileName = [];
        } else {
          $scope.form.arySelectAttFileName=[]
          $scope.formData.idxfiles.filter(function(item) {
            if(item.catnum!=-5){//去掉本地选的意见附件
              $scope.form.arySelectAttFileName.push(item.name)
            };
          })
        }
      }else{//选意见附件
        if ($scope.form.arySelectAttitudeFileName.length == $scope.form.yjfilelength) {
          $scope.form.arySelectAttitudeFileName = [];
        } else {
          $scope.form.arySelectAttitudeFileName=[]
          $scope.idxfiles.filter(function(item) {
            if(item.catnum==-5){
              $scope.form.arySelectAttitudeFileName.push(item.name)
            };
          })
        }
      }
    }
    $scope.yjfilter = {}; //意见过滤
    $scope.yjfilter.filterTypeValue = 1;
    $scope.yjfilter.filterTypeLabel = "全部意见";
    $scope.yjfilter.levels = [];
    var getShenPiJb = false
    $scope.getShenPiJb = function () {
      if (getShenPiJb) {
        return
      }
      getShenPiJb = true;
      var yjlevels = "全部意见|1";      
      //读取scope.form.depHKYJs 意见对象,不需要重新通过表单接口获取
      $scope.form.depHKYJs.forEach(function (yj) {
        if (yj.shenpijibie && yj.shenpijibie !== "1") {
          if (yjlevels.indexOf(yj.shenpijibie) < 0) {
            switch (yj.shenpijibie) {
              case "2":
                yjlevels = yjlevels + "&部门领导|2";
                break;
              case "3":
                yjlevels = yjlevels + "&公司领导|3";
                break;
              case "4":
                yjlevels = yjlevels + "&部门总监|4";
                break;
              default:
            }
          }
        }
      });
      yjlevels.split("&").forEach(function (spjb) {
        var data = {
          label: spjb.split("|")[0],
          value: spjb.split("|")[1]
        };
        $scope.yjfilter.levels = $scope.yjfilter.levels.concat(data);
      });
    }

    $scope.filterYj = function ($event) {
      $scope.$on('$destroy', function () {
        $scope.yjPop && $scope.yjPop.remove();
      });
      if ($scope.yjPop) {
        $scope.yjPop.show($event);
        return
      }
      $scope.filterYjByType = function (value, text) {
        $scope.yjPop.hide();
        $scope.yjfilter.filterTypeValue = value;
        $scope.yjfilter.filterTypeLabel = text;
        if (value == 1) {
          $scope.yjs = $scope.yjfilter.yjs
          return
        }
        $scope.yjs = $scope.yjfilter.yjs.filter(function (item) {
          return item.shenpijibie == $scope.yjfilter.filterTypeValue
        })
      }
      var template = '<ion-popover-view class="filterYj">' +
        '<ion-content>' +
        '<ion-list>' +
        '<ion-item ng-repeat="x in yjfilter.levels" ng-click="filterYjByType({{x.value}},\'{{x.label}}\')" class="item-icon-right">' +
        '{{x.label}}<i class="{{yjfilter.filterTypeValue==x.value?\'icon ion-android-done\':\'\'}}"></i>' +
        '</ion-item>' +
        '</ion-list>' +
        '<ion-content>' +
        '</ion-popover-view>'
      $scope.yjPop = $ionicPopover.fromTemplate(template, {
        scope: $scope
      })
      $scope.yjPop.show($event);
    }
    $scope.zhfilter = {}; //只会过滤
    function _filterZh() {


      $scope.zhfilter.filterTypeValue = 1;
      $scope.zhfilter.filterTypeLabel = "全部" + $scope.zhfilter.zhihuiText;
      $scope.zhfilter.levels = [{
        label: '全部' + $scope.zhfilter.zhihuiText,
        value: '1'
      }, {
        label: '我的' + $scope.zhfilter.zhihuiText,
        value: '2'
      }]
      $scope.filterZh = function ($event) {
        $scope.$on('$destroy', function () {
          $scope.zhPop && $scope.zhPop.remove();
        });
        if ($scope.zhPop) {
          $scope.zhPop.show($event);
          return
        }
        $scope.filterZhByType = function (value, text) {
          $scope.zhPop.hide();
          $scope.zhfilter.filterTypeValue = value;
          $scope.zhfilter.filterTypeLabel = text;
          if (value == 1) {
            $scope.zhjilu = $scope.zhfilter.zhjilu = $scope.zhjiluCopy;
            $scope.zhjiluCount = $scope.zhjiluTotal;
            $scope.tabsInfo.notify.count = $scope.zhjiluCount.length;
            return
          }
          $scope.zhfilter.zhjilu = $scope.zhjiluTotalCopy;
          var unique = [];
          var isSender = false;
          var result = $scope.zhfilter.zhjilu.filter(function (item) {
            return item.from == $scope.context.userinfo.fullname || item.to == $scope.context.userinfo.fullname
          })
          $scope.zhjilu = result.filter(function (item) {
            if (item.from == $scope.context.userinfo.fullname && unique.indexOf(item.unique) > -1) {
              isSender = true;
              return;
            }
            unique.push(item.unique);
            return item.from == $scope.context.userinfo.fullname || item.to == $scope.context.userinfo.fullname
          })
          //只保留我的知会记录
          angular.forEach($scope.zhjilu, function (item) {
            if (item.from != $scope.context.userinfo.fullname) {
              item.yiyue = item.yiyue.filter(function(item) {
                return item.to == $scope.context.userinfo.fullname;
              });
              item.weiyue = item.weiyue.filter(function(item) {
                return item.to == $scope.context.userinfo.fullname;
              });
              item.yuebi = item.yuebi.filter(function(item) {
                return item.to == $scope.context.userinfo.fullname;
              });
            }
          });
          if (isSender) {
            $scope.zhjiluCount = result;
          } else {
            $scope.zhjiluCount = $scope.zhjilu;
          }
          $scope.tabsInfo.notify.count = $scope.zhjiluCount.length;
        }
        var template = '<ion-popover-view class="filterYj">' +
          '<ion-content>' +
          '<ion-list>' +
          '<ion-item ng-repeat="x in zhfilter.levels" ng-click="filterZhByType({{x.value}},\'{{x.label}}\')" class="item-icon-right">' +
          '{{x.label}}<i class="{{zhfilter.filterTypeValue==x.value?\'icon ion-android-done\':\'\'}}"></i>' +
          '</ion-item>' +
          '</ion-list>' +
          '<ion-content>' +
          '</ion-popover-view>'
        $scope.zhPop = $ionicPopover.fromTemplate(template, {
          scope: $scope
        })
        $scope.zhPop.show($event);
      }
    }
    $scope.showZw = function () {
      if (indiConfig.modules.webflow.showMainFileOnTabClick()) { //直接打开或打开页签
        $imAtt.show($scope.zhengwen[0])
      } else {
        var tabs = document.querySelector("ION-TABS[delegate-handle=webflow]").querySelectorAll("ION-TAB")
        angular.forEach(tabs, function (item, index) {
          if (item.attributes['ng-click'] && item.attributes['ng-click'].value == "showZw()") {
            $ionicTabsDelegate.$getByHandle('webflow').select(index)
          }
        })
      }
    }
    $scope.changeSubmitNode=function(){//多个环节时，选择分裂合并自动提交
      var item=$scope.form.nodeList[$scope.form.nextNode]
      var returnSence=item.returnSence
      if(returnSence=="SubmitBtn_sence9"){//多环节选中了分裂，自动确定
        $scope.submitForm()
      }      
      //判断是否为自动确定环节
      if(item.zdqd === "yes" && item.nodeInfo) {
        if(item.submitto && item.submitto.length == 0) {
          //自动确认时当出现选人人为空时,alertWhenNull 值true表示弹出提示修改流程,false标识出现处理人范围选择
          if(item.nodeInfo.alertWhenNull) {
            $ionicPopup.alert({template: "自动提交默认处理人为空,请联系管理员"});
            return true;
          }
        } else {
          //自动确定
          $scope.submitForm();
          return;
        }
      }
      //流程结束，合并，会签反馈，根据开关判断是否自动确定
      if(indiConfig.modules.webflow.submit.doubleCheckWhenNoOptionFlowSubmit()){//开关如果保持原状态，不变
        return
      }
      if(returnSence=="SubmitBtn_sence10"||item.returnSence=="SubmitBtn_sence6"){//流程结束合并，自动确定
        $scope.submitForm()
      }
      if(item.type=="hqfk" && $scope.form.flowconfig.key_SelectFKJY=="0" && $scope.form.flowconfig.key_HQFKSelectAtt=="0"){//会签反馈,并且不需要反馈意见
        var  hasyjfile=false
        $scope.formData.idxfiles.concat($scope.idxfiles).some(function(idx){
          if(idx.catnum=="-5"){
            hasyjfile=true
            return true
          }
        })
        if(!hasyjfile){
          $scope.submitForm()
        }
      }
    }
  })
  .controller('CyyCtrl', function ($scope, CyyService, $ionicPopup, $timeout, $ionicListDelegate, $imTimedInfo, $ionicScrollDelegate) {
    // window.onclick = function(){
    //   $ionicListDelegate.$getByHandle().closeOptionButtons();
    // }
    //常用语
    $scope.cyyoption = true;
    $scope.removeThisCyy = function (cyyid) { //删除
      $ionicPopup.confirm({
        title: '确认删除？',
      }).then(function (res) {
        if (res) {
          CyyService.cyyRemove($scope.fileinfo, cyyid).then(function (data) {
            $imTimedInfo.show(data.msg).then(function () {
              if (data.type == "success") {
                $scope.getcyy();
              }
            })
          })
        }
      });
    }
    $scope.addOneCyy = function () { //添加
      var isexist = false;
      CyyService.get($scope.fileinfo).then(function (data) {

        angular.forEach(data, function (item) {
          if (item.docUnid == "") {
            if (item.content == "#_#" + $scope.form.onecyy) {
              $imTimedInfo.show("常用语已存在，请勿重复添加")
              isexist = true;
            }
          } else {
            if (item.content == $scope.form.onecyy) {
              $imTimedInfo.show("常用语已存在，请勿重复添加")
              isexist = true;
            }
          }

        })
        if (isexist == true) {
          $scope.addcyyshow = false;
          $scope.cyyoption = true;
          return
        } else {
          CyyService.cyyAdd($scope.fileinfo, $scope.form.onecyy).then(function (data) {
            $imTimedInfo.show(data.msg).then(function () {
              if (data.type == "success") {
                $scope.getcyy();
              }
            })
          });
          $scope.addcyyshow = false;
          $scope.cyyoption = true;
        }
        $ionicScrollDelegate.resize();
      })
    }
    $scope.updateThisCyy = function (uid, con, index, e) { //修改
      if (con == "") {
        $imTimedInfo.show("您输入的内容为空")
      } else {
        if ($scope.myCyy[index].temcon == con) {
          $scope.myCyy[index].show = false;
        } else {
          var len = 0;
          angular.forEach($scope.myCyy, function (item) {
            if ((item.content).trim() == (con).trim()) {
              len++;
            }
          });
          if (len > 1) {
            $imTimedInfo.show("常用语已存在，请勿重复添加")
            return
          } else {
            $scope.myCyy[index].show = false;
            CyyService.cyyupdate($scope.fileinfo, uid, con).then(function (data) {
              $imTimedInfo.show(data.msg)
            })
          }
        }
      }
    }
    $scope.editCyy = function (index) {
      $scope.myCyy[index].show = true;
      $scope.myCyy[index].temcon = $scope.myCyy[index].content;
    }
    $scope.showAddcyy = function () {
      var text = document.getElementById('add-content');
      $timeout(function () {
        text.focus();
      }, 50)

      $scope.form.onecyy = "";
      $scope.addcyyshow = true;
      $scope.cyyoption = false;
      $ionicScrollDelegate.resize();
    }
  })
  .controller('RecordAttitudeCtrl', function ($scope, $imNotesName, $timeout) {
    var showErr = function (err) {
      console.log(err)
    }
    $scope.RecordInfo.isplaying = false;
    var encodeRec = function (then) {
      // 将wav编码为m4a

      var date = new Date()
      var filename = $scope.RecordInfo.duration + "_" + $imNotesName.toCN($scope.curinfo[0].user) + "_" + $scope.curinfo[0].flownum + "_" + moment(date).format("YYYYMMDDHHmmss") + "_yuyin.m4a"

      if (cordova.platformId == "ios") {
        window.encodeAudio($scope.RecordInfo.wavFullPath, function (newM4APath) {
          $scope.RecordInfo.m4aFullPath = newM4APath;
          window.resolveLocalFileSystemURL('cdvfile://localhost/temporary/record.m4a', function (entry) {
            entry.file(function (file) {
              var reader = new FileReader();
              reader.onloadend = function () {
                $scope.form.yjatt.name = filename;
                $scope.form.yjatt.base64 = this.result;
                if (then == "submit") {
                  $scope.submit();
                }
                if (then == "play") {
                  audioplay();
                }
              };
              reader.readAsDataURL(file);
            }, function () {});
          })

        })
      } else {
        var gotFileEntry = function (fileEntry) {
          fileEntry.file(function (file) {
            var reader = new FileReader();
            reader.onloadend = function (evt) {

              $scope.form.yjatt.name = filename;
              $scope.form.yjatt.base64 = evt.target.result;
              if (then == "submit") {
                $scope.submit();
              }
              if (then == "play") {
                audioplay();
              }
            };
            reader.readAsDataURL(file);
          }, function () {});
        };
        window.resolveLocalFileSystemURL($scope.m4asrc, gotFileEntry, function () {});
      }
    }

    $scope.submitRecord = function () {
      $scope.RecordInfo.refPopup.close();
      if ($scope.form.yjatt.base64 == "") {
        encodeRec('submit');
      } else {
        $scope.submit();
      }
    }
    $scope.saveRecord = function () {
      $scope.RecordInfo.refPopup.close();
      if ($scope.form.yjatt.base64 == "") {
        encodeRec();
      }
    }
    $scope.playRecord = function () {
      var src = 'cdvfile://localhost/temporary/record.m4a';
      if (cordova.platformId == "ios") {
        src = 'cdvfile://localhost/temporary/record.wav';
      }
      var dura = $scope.RecordInfo.duration;

      $scope.RecordInfo.current = 0
      if ($scope.RecordInfo.isplaying == true) {

        $scope.RecordInfo.isplaying = false;
        angular.element(document.body).find(".gray .im-radial-progress .bar-fg").css("-webkit-transition", "stroke-dashoffset  " + 0 + "s linear")
        $scope.RecordInfo.current = 0;
        if ($scope.RecordInfo.media) {
          $scope.RecordInfo.media.pause();
        }
        return;
      }

      $scope.RecordInfo.media = new Media(src,
        function () {},
        function (err) {
          console.log(err);
        },
        function (status) {
          //ios下检测不到状态1 ，所以1和2一起判断
          if (status == 1 || status == 2) {
            $scope.$apply(function () {
              $scope.RecordInfo.isplaying = true;
            });
          }
          if (status == 4) {
            if ($scope.RecordInfo.media) {
              $scope.RecordInfo.media.pause();
            }
            $scope.$apply(function () {
              if ($scope.RecordInfo.media) {
                $scope.RecordInfo.media.pause();
              }
              $scope.RecordInfo.isplaying = false;
              angular.element(document.body).find(".gray .im-radial-progress .bar-fg").css("-webkit-transition", "stroke-dashoffset  " + 0 + "s linear")
              $scope.RecordInfo.current = 0;

            }, 200);
          }
        }
      );

      var iOSPlayOptions = {
        numberOfLoops: 1,
        playAudioWhenScreenIsLocked: false
      }
      if (cordova.platformId == "ios") {


        $scope.RecordInfo.media.play(iOSPlayOptions);
      } else {
        $scope.RecordInfo.media.play();
      }
      $scope.RecordInfo.current = 100
      angular.element(document.body).find(".gray .im-radial-progress .bar-fg").css("-webkit-transition", "stroke-dashoffset  " + dura + "s linear")
    }
  })

  .controller('HandAttitudeCtrl', function ($scope) {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    var canvas_hr = document.getElementById("canvas_hr");
    var ctx_hr = canvas_hr.getContext("2d");
    var initCan = ctx.getImageData(0, 0, 318, 480).data; //白板
    $scope.clearCanvas = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx_hr.clearRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      $scope.HAInfo.data = "";
      $scope.HAInfo.hasImg = "";
    }
    $scope.saveHA = function () {
      var imgwidth = canvas.width;
      var imgheight = canvas.height;
      ctx_hr.drawImage(canvas, -(imgwidth / 2), -(imgheight / 2));
      var data = canvas_hr.toDataURL();
      if ($scope.$indimobile.$isPad) {
        data = canvas.toDataURL();
      }
      if ($scope.HAInfo.hasImg == "true") { //对比下如果是白的就不添加到手写意见了
        $scope.HAInfo.data = data;
      }
      $scope.closeHAModal();
    }
  })