const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();

function getNvmeData (argv){
    const nvme = GLib.find_program_in_path('nvme');
    return JSON.parse(GLib.spawn_command_line_sync(`${nvme} ${argv} -o json`)[1].toString());
}

var nvmecliUtil  = class {
    constructor(callback) {
        this._sensors = [];
        this._nvmeDevices = [];
        try {
            this._nvmeDevices = getNvmeData("list")["Devices"]
        } catch (e) {
            global.log('[FREON] Unable to find nvme devices: ' + e);
        }        
        this._updated = true;
    }

    get available(){
        return this._nvmeDevices.length > 0;
    }

    get updated (){
       return this._updated;
    }

    set updated (updated){
        this._updated = updated;
    }

    get temp() {
       return this._sensors;
    }

    destroy(callback) {
        this._nvmeDevices = [];
    }

    execute(callback) {
        let collectedData = [];
        let toExecute = this._nvmeDevices.length;

        this._nvmeDevices.forEach((dev) => {
            const cmd = new CommandLineUtil.CommandLineUtil();
            const nvme = GLib.find_program_in_path('nvme')
            cmd._argv = [nvme, "smart-log", dev["DevicePath"], "-o json"];

            cmd.execute(() => {
                if(cmd._error_output.length > 0){
                    global.log(`[FREON] Unable to query smart device ${dev["DevicePath"]}:\n ${cmd._error_output.join('\n')}`);
                }else{
                    const smart_log = JSON.parse(cmd._output[1]);
                    if(smart_log.hasOwnProperty('temperature_sensor_2')){
                        collectedData.push({
                            label: device["ModelNumber"] + " S1",
                            temp: parseFloat(smart_log.temperature_sensor_1) - 273.15
                        });
                        collectedData.push({
                            label: device["ModelNumber"] + " S2",
                            temp: parseFloat(smart_log.temperature_sensor_2) - 273.15
                        });
                    }else{
                        collectedData.push({
                            label: device["ModelNumber"],
                            temp: parseFloat(smart_log.temperature) - 273.15
                        });
                    }
                }

                cmd.destroy();

                if(--toExecute === 0){
                    this._sensors = collectedData;
                    if(callback) callback();
                    this._updated = true;
                }
            });
        });
    }

};
