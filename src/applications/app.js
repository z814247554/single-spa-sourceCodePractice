import { LOADING_SOURCE_CODE, MOUNTED, NOT_BOOTSTRAPPED, BOOTSTRAPPING, NOT_LOADED, NOT_MOUNTED } from "./app.helps";
import { reroute } from '../navigations/reroute';
import { shouldBeActive } from '../applications/app.helps';
/**
 * @params {*} appName 应用名字
 * @params {*} loadApp 加载的应用
 * @params {*} activeWhen 当激活时会调用loadApp
 * @params {*} customProps 自定义属性
 */
const apps = [];  //存放所有的应用

// 维护应用所有的状态  状态机
export function registerApplication(appName,loadApp,activeWhen,customProps){
  apps.push({  //这里就将应用注册好了
    name:appName,
    loadApp,
    activeWhen,
    customProps,
    status:NOT_LOADED
  });
  reroute();
}

export function getAppChanges(){
  const appsToUnmount = [];  //要卸载的APP
  const appsToLoad = [];  //要加载的APP
  const appsToMount = [];  //要挂载的APP
  
  apps.forEach(app=>{
    const appShouldBeActive = shouldBeActive(app);
    
    switch(app.status){
      case NOT_LOADED:
      case LOADING_SOURCE_CODE:
        if(appShouldBeActive){
          appsToLoad.push(app)
        }
        break;
      case NOT_BOOTSTRAPPED:
      case BOOTSTRAPPING:
      case NOT_MOUNTED:
        if(appShouldBeActive){
          appsToMount.push(app)
        }
        break;
      case MOUNTED:
        if(!appShouldBeActive){
          appsToUnmount.push(app)
        }
        break;
    }
  })
  return {appsToLoad,appsToMount,appsToUnmount}
}