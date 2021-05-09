(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.singleSpa = {}));
}(this, (function (exports) { 'use strict';

    // 描述应用的整个状态

    const NOT_LOADED = 'NOT_LOADED';  // 应用初始状态
    const LOADING_SOURCE_CODE = 'LOADING_SOURCE_CODE';  //加载资源
    const NOT_BOOTSTRAPPED = 'NOT_BOOTSTRAPPED';
    const BOOTSTRAPPING = 'BOOTSTRAPPING';   //  启动中
    const NOT_MOUNTED = 'NOT_MOUNTED';   //  没有调用mounte方法
    const MOUNTING = 'MOUNTING';   //  正在挂载中
    const MOUNTED = 'MOUNTED';   //  挂载完毕 
    const UNMOUNTING = 'UNMOUNTING';   //  解除挂载    

    // 当前应用是否要被激活
    function shouldBeActive(app){   //如果返回true 那么应用就开始初始化等一系列操作
        return app.activeWhen(window.location)
    }

    let stated = false;
    function start(){
      // 需要挂载应用
      stated=true;
      reroute();  //除了去加载应用还要去挂载应用
    }

    function flattenFnArray(fns){
        fns = Array.isArray(fns)?fns:[fns];
        // Promise.resolve().then(()=>fn1(props)).then(()=>fn2(props));
        // 通过promise链来链式调用  多个方法组合成一个方法
        return (props)=>{
            return fns.reduce((p,fn)=>p.then(()=>fn(props)),Promise.resolve());
        }
    }

    async function toLoadPromise(app){
        if(app.loadPromise){
            return app.loadPromise;  //缓存机制
        }

        
        return (app.loadPromise = Promise.resolve().then(async ()=>{
            app.status = LOADING_SOURCE_CODE;
            let {bootstrap,mount,unmount} = await app.loadApp(app.customProps);
            app.status = NOT_BOOTSTRAPPED;  //还没有调用bootstrap方法
        
            //将多个promise组合到一起 compose
            app.bootstrap = flattenFnArray(bootstrap);
            app.mount = flattenFnArray(mount);
            app.unmount = flattenFnArray(unmount);
            delete app.loadPromise;
            return app

        }))

    }

    async function toBootstrapPromise(app){
      if(app.status != NOT_BOOTSTRAPPED){
        return app
      }
      app.status = BOOTSTRAPPING;
      await app.bootstrap(app.customProps);
      app.status = NOT_MOUNTED;
      return app;
    }

    async function toMountPromise(app){
      if(app.status != NOT_MOUNTED){
        return app
      }
      app.status = MOUNTING;
      await app.mount(app.customProps);
      app.status = MOUNTED;
      return app;
    }

    async function toUnmountPromise(app){
        // 当前应用有没有被挂载
        if(app.status!=MOUNTED){
            return app
        }
        app.status = UNMOUNTING;
        await app.unmount(app.customProps);
        app.status = NOT_MOUNTED;
        return app;
    }

    //  hashchange  popstate

    const routingEventsListeningTo = ['hashchange','popstate'];

    function urlReroute(e){
        reroute();   //根据路径重新加载不同的应用
    }

    const capturedEventListeners = {   //后续挂载的事件先暂存起来
        hashchange:[],  
        popstate:[],  //当应用切换完成后调用
    };

    // 处理应用加载的逻辑在最前面
    window.addEventListener('hashchange',urlReroute);
    window.addEventListener('popstate',urlReroute);

    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;

    window.addEventListener = function(eventName,fn){
        if(routingEventsListeningTo.indexOf(eventName)>0 && capturedEventListeners[eventName].some(listener=>listener == fn)){
          capturedEventListeners[eventName].push(fn);
          return
        }
        return originalAddEventListener.apply(this,arguments)
    };

    window.removeEventListener = function(eventName,fn){
      if(routingEventsListeningTo.indexOf(eventName)>0){
        capturedEventListeners[eventName] = capturedEventListeners[eventName].filter(l=>l!=fn);
        return
      }
      return originalRemoveEventListener.apply(this,arguments)
    };

    // 如果是hash路由，hash变化是可以切换
    // 浏览器路由，浏览器路由是H5qpiDE ,如果切换时不会触发popstate

    function patchedUpdateState(updateState,methodName){
      return function(){
        const urlBefore = window.location.href;
        updateState.apply(this,arguments); // 调用切换的方法
        const urlAfter = window.location.href;
        if(urlAfter !== urlBefore){
          // 重新加载应用 传入事件源
          urlReroute(new PopStateEvent('popstate'));
        }
      }
    }


    window.history.pushState = patchedUpdateState(window.history.pushState);
    window.history.replaceState = patchedUpdateState(window.history.replaceState);

    //用户可能还会绑定自己的路由事件 vue


    // 当应用切换后，还要处理原来的方法，需要在应用切换后执行

    // 核心应用处理方法
    function reroute(){

        // 需要获取 需要加载的应用
        // 需要获取 要被挂载的应用
        // 哪些应用需要被卸载
        const {appsToLoad,appsToMount,appsToUnmount} = getAppChanges();
        // start 是同步的,但加载是异步的
        if(stated){
            // app 装载
            return performAppChanges();
        }else {
            // 注册应用时，需要预先加载
            return loadApps();

        }

        async function performAppChanges(){  //预先加载 
            // 先卸载不需要的应用
            appsToUnmount.map(toUnmountPromise);  //需要去卸载的aoo
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
            });
        }
        
        async function loadApps(){   //根据路径来装载应用
            
            await Promise.all(appsToLoad.map(toLoadPromise));
        }
    }

    // 这个流程是用于初始化操作的，还需要路径切换时重新加载应用
    // 重写路由相关的方法

    /**
     * @params {*} appName 应用名字
     * @params {*} loadApp 加载的应用
     * @params {*} activeWhen 当激活时会调用loadApp
     * @params {*} customProps 自定义属性
     */
    const apps = [];  //存放所有的应用

    // 维护应用所有的状态  状态机
    function registerApplication(appName,loadApp,activeWhen,customProps){
      apps.push({  //这里就将应用注册好了
        name:appName,
        loadApp,
        activeWhen,
        customProps,
        status:NOT_LOADED
      });
      reroute();
    }

    function getAppChanges(){
      const appsToUnmount = [];  //要卸载的APP
      const appsToLoad = [];  //要加载的APP
      const appsToMount = [];  //要挂载的APP
      
      apps.forEach(app=>{
        const appShouldBeActive = shouldBeActive(app);
        
        switch(app.status){
          case NOT_LOADED:
          case LOADING_SOURCE_CODE:
            if(appShouldBeActive){
              appsToLoad.push(app);
            }
            break;
          case NOT_BOOTSTRAPPED:
          case BOOTSTRAPPING:
          case NOT_MOUNTED:
            if(appShouldBeActive){
              appsToMount.push(app);
            }
            break;
          case MOUNTED:
            if(!appShouldBeActive){
              appsToUnmount.push(app);
            }
            break;
        }
      });
      return {appsToLoad,appsToMount,appsToUnmount}
    }

    exports.registerApplication = registerApplication;
    exports.start = start;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=single-spa.js.map
