const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const UDisks2 = Me.imports.udisks2;
const smartctlUtil = Me.imports.smartctlUtil;

const Udisks2PlusSmartctl = class{

    constructor(callback) {
        this._updated = false;
        this._smartctl = new smartctlUtil.smartctlUtil();
        this._udisks = new UDisks2.UDisks2(() => this.listDevices());
    }

    execute(callback){
        const execUdisks2 = new Promise((resolve) => {
            this._udisks.execute(() => resolve());
        });
        const execSmartctl = new Promise((resolve) => {
            this._smartctl.execute(() => resolve());
        });

        Promise.allSettled([execUdisks2, execSmartctl]).then(() => {
            if(callback) callback();
        });
    }

    get available(){
        return this._udisks.available || this._smartctl.available;
    }

    get updated (){
       return this._updated;
    }

    set updated (updated){
        this._updated = updated;
    }

    get temp() {
        return [...this._udisks.temp, ...this._smartctl.temp];
    }

    destroy(callback) {
        this._udisks.destroy(() => this._smartctl.destroy(callback));
    }

    listDevices(){
        // use all of UDisk2; use missing from smartctl

        const udisksDevNames = [];
        this._udisks._udisksProxies.filter((proxy) => {
            return proxy.ata.SmartTemperature > 0;
        }).forEach((proxy) => {
            udisksDevNames.push(proxy.drive.Model);
        });

        const adds = [];
        this._smartctl._smartDevices.forEach((dev) => {
            if(!udisksDevNames.includes(dev.label)){
                adds.push(dev);
            }
        });
        this._smartctl._smartDevices = adds;
    }
};