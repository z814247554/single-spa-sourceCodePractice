//  hashchange  popstate

import { reroute } from "./reroute";

export const routingEventsListeningTo = ['hashchange','popstate'];

function urlReroute(e){
    reroute([],arguments)   //根据路径重新加载不同的应用
}

const capturedEventListeners = {   //后续挂载的事件先暂存起来
    hashchange:[],  
    popstate:[],  //当应用切换完成后调用
}

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
}

window.removeEventListener = function(eventName,fn){
  if(routingEventsListeningTo.indexOf(eventName)>0){
    capturedEventListeners[eventName] = capturedEventListeners[eventName].filter(l=>l!=fn);
    return
  }
  return originalRemoveEventListener.apply(this,arguments)
}

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


window.history.pushState = patchedUpdateState(window.history.pushState,'pushState');
window.history.replaceState = patchedUpdateState(window.history.replaceState,'replaceState');

//用户可能还会绑定自己的路由事件 vue


// 当应用切换后，还要处理原来的方法，需要在应用切换后执行


