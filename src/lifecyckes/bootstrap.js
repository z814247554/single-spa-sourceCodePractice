import { NOT_BOOTSTRAPPED, NOT_MOUNTED,BOOTSTRAPPING } from "../applications/app.helps";

export async function toBootstrapPromise(app){
  if(app.status != NOT_BOOTSTRAPPED){
    return app
  }
  app.status = BOOTSTRAPPING;
  await app.bootstrap(app.customProps);
  app.status = NOT_MOUNTED;
  return app;
} 