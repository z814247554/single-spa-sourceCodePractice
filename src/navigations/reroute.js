import { getAppChanges } from "../applications/app";
import { stated } from "../start"
import {toLoadPromise} from "../lifecyckes/load"
import {toBootstrapPromise} from "../lifecyckes/bootstrap"
import {toMountPromise} from "../lifecyckes/mount"
import { toUnmountPromise } from "../lifecyckes/unmount";
import './navigator-events'

// 核心应用处理方法
export function reroute(){

    // 需要获取 需要加载的应用
    // 需要获取 要被挂载的应用
    // 哪些应用需要被卸载
    const {appsToLoad,appsToMount,appsToUnmount} = getAppChanges();
    // start 是同步的,但加载是异步的
    if(stated){
        // app 装载
        return performAppChanges();
    }else{
        // 注册应用时，需要预先加载
        return loadApps();

    }

    async function performAppChanges(){  //预先加载 
        // 先卸载不需要的应用
        let unmountPromises = appsToUnmount.map(toUnmountPromise)  //需要去卸载的aoo
        // 去加载需要的应用
        // 这个应用可能需要加载,但是路径不匹配,加载app1的时候切换到app2的时候
        
        appsToLoad.map(async (app)=>{ //将需要加载的应用 拿到=> 加载 => 启动 => 挂载
            app = await toLoadPromise(app);
            app = await toBootstrapPromise(app);
            return toMountPromise(app);
        }); 
        appsToMount.map(async (app)=>{
          app = await toBootstrapPromise(app);
          return toMountPromise(app);
        })
    }
    
    async function loadApps(){   //根据路径来装载应用
        
        let apps = await Promise.all(appsToLoad.map(toLoadPromise));
    }
}

// 这个流程是用于初始化操作的，还需要路径切换时重新加载应用
// 重写路由相关的方法
