import { reroute } from './navigations/reroute';

export let stated = false;
export function start(){
  // 需要挂载应用
  stated=true;
  reroute();  //除了去加载应用还要去挂载应用
}