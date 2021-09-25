const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const CommandLineUtil = Me.imports.commandLineUtil;

var smartctlUtil = class{

    constructor(callback) {
        try {
            this._smartDevices = this.listSmartDevices();
        } catch (e) {
            global.log('[FREON] Unable to find smart devices: ' + e);
        }

        this._updated = true;
    }

    execute(callback){
        let toExecute = this._smartDevices.length;

        this._smartDevices.forEach((dev) => {
            const devName = dev.name;

            const cmd = new CommandLineUtil.CommandLineUtil();
            const sudo = GLib.find_program_in_path('sudo');
            const smartctl = GLib.find_program_in_path('smartctl');
            cmd._argv = [sudo, smartctl, "--attributes", devName, "-j"];

            cmd.execute(() => {
                if(cmd._error_output.length > 0){
                    global.log(`[FREON] Unable to query smart device ${devName}:\n ${cmd._error_output.join('\n')}`);
                }else{
                    const devData = JSON.parse(cmd._output.join(' '));
                    dev.temp = parseFloat(devData.temperature.current);
                }

                cmd.destroy();

                if(--toExecute === 0){
                    this._updated = true;
                    if(callback) callback();
                }
            });
        });
    }

    get available(){
        return this._smartDevices.length > 0;
    }

    get updated (){
       return this._updated;
    }

    set updated (updated){
        this._updated = updated;
    }

    get temp() {
        return this._smartDevices.map(device => {
            return {
                label: device.label,
                temp: device.temp
            }
        })
    }

    destroy(callback) {
        this._smartDevices = [];
        if(callback) callback();
    }

    /**
     * 
     * @returns [{name, label, temp}, ...]
     */
    listSmartDevices(){
        let ret = [];

        const sudo = GLib.find_program_in_path('sudo');
        const smartctl = GLib.find_program_in_path('smartctl');

        // list devices
        const devListData = JSON.parse(ByteArray.toString(GLib.spawn_command_line_sync(`${sudo} ${smartctl} --scan -j`)[1]));
        devListData.devices.forEach((dev) => {
            const devName = dev.name;
            // query labels
            const devData = JSON.parse(ByteArray.toString(GLib.spawn_command_line_sync(`${sudo} ${smartctl} --info ${devName} -j`)[1]));
            const devLabel = devData.model_name;

            ret.push({
                name: devName,
                label: devLabel,
                temp: -1
            });
        });

        return ret;
    }
};
