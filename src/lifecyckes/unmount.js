import { MOUNTED, NOT_MOUNTED, UNMOUNTING } from "../applications/app.helps";

export async function toUnmountPromise(app){
    // 当前应用有没有被挂载
    if(app.status!=MOUNTED){
        return app
    }
    app.status = UNMOUNTING;
    await app.unmount(app.customProps);
    app.status = NOT_MOUNTED;
    return app;
}