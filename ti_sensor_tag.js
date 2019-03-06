/**
 * @author Trieu Vi Tran - 15800120
 * @version 0.2.0
 */

const services = {
    deviceInfo: {
        name: 'Device Information Service',
        uuid: '0000180a-0000-1000-8000-00805f9b34fb'
    },
    irTemp: {
        name: 'IR Temperature Service',
        uuid: 'f000aa00-0451-4000-b000-000000000000'
    },
    humidity: {
        name: 'Humidity Service',
        uuid: 'f000aa20-0451-4000-b000-000000000000'
    }
}

const characteristics = {
    deviceInfo:{ 
        modelName: {
            name: 'Model Number String',
            uuid: '00002a24-0000-1000-8000-00805f9b34fb'
        }
    },
    irTemp: {
        data: {
            name: 'IR Temperature Data',
            uuid: 'f000aa01-0451-4000-b000-000000000000'
        },
        config: {
            name: 'IR Temperature Configuration',
            uuid: 'f000aa02-0451-4000-b000-000000000000'
        },
        period: {
            name: 'IR Temperature Period',
            uuid: 'f000aa03-0451-4000-b000-000000000000'
        }
    },
    humidity: {
        data: {
            name: 'Humidity Data',
            uuid: 'f000aa21-0451-4000-b000-000000000000'
        },
        config: {
            name: 'Humidity Configuration',
            uuid: 'f000aa22-0451-4000-b000-000000000000'
        },
        period: {
            name: 'Humidity Period',
            uuid: 'f000aa23-0451-4000-b000-000000000000'
        }
    }
}

let options = {
    acceptAllDevices: true,
    optionalServices: [services.deviceInfo.uuid]
};

var self;
var state = {};

class TISensorTag {
    constructor() {
        self = this;
        this.device;
        this.server;
        this.name;
        this.modelName;
        this.temperatureC;
        this.services = services;
        this.characteristics = characteristics;
    }

    connect() {
        return navigator.bluetooth.requestDevice(options)
        .then(device => {
            console.log('Found device');
            //code
            self.device = device;
            self.name = device.name;
            return device.gatt.connect();
        })
        .then(server => {
            console.log('Connect to server');
            self.server = server;
            self.getServices(self.server, [self.services.deviceInfo, self.services.irTemp], [self.characteristics.deviceInfo.modelName, self.characteristics.irTemp.data, self.characteristics.irTemp.config, self.characteristics.irTemp.period]);
        })
        .catch(error => {
            console.trace('Error: ' + error);
        })
    }

    disconnect() {
        self.server.disconnect();
    }

    getServices(server, services, characteristics) {
        getModelName(server, services[0], characteristics[0]);
        getIRTemperature(server, services[1], characteristics.slice(1));
    }

    getIRTemperature(server, service, chars) {
        server.getPrimaryService(service)
        .then(service => {
            irControl(service, chars[1]);
            irPeriod(service, chars[2]);
            irData(service, chars[0]);
        })
        .catch(error => {
            console.trace('Error: ' + e);
        })
        
    }

    irControl(service, char) {
        service.getCharacteristic(char.uuid)
        .then(char => {
            var commandValue = new Uint8Array([0x01]);
            return char.writeValue(commandValue);
        })
        .then(value => {
            console.log(value);
        })
        .catch(error => {
            console.trace('Error: ' + e);
        })
    }

    irPeriod(service, char) {
        service.getCharacteristic(char.uuid)
        .then(char => {
            var commandValue = new Uint8Array([0x64]);
            return char.writeValue(commandValue);
        })
        .then(value => {
            console.log(value);
        })
        .catch(error => {
            console.trace('Error: ' + e);
        })
    }

    irData(service, char) {
        service.getCharacteristic(char.uuid)
        .then(char => {
            char.startNotifications().then(res => {
                char.addEventListener('characteristicvaluechanged', self.handleTempChange);
            });
        })
        .catch(error => {
            console.trace('Error: ' + e);
        })
    }

    getModelName(server, service, char) {
        server.getPrimaryService(service.uuid)
        .then(service => {
            return service.getCharacteristic(char.uuid);
        })
        .then(char => {
            return char.readValue();
        })
        .then(values => {
            let temp = '';
            for (var i = 0; i < 16; i++) {
                temp += String.fromCharCode(values.getUint8(i));
            }
            self.modelName = temp;

            state.modelName = temp;
            console.log(self.modelName);

            self.onStateChangeCallback(state);
        })
        .catch(error => {
            console.trace('Error: ' + error);
        });
    }

    handleTempChange(event) {
        // byteLength of ir data is 4
        // v1 = getUint8(3) must be length 2
        // v2 = getUint8(2) must be length 2
        // data = parseInt('0x' + v1.toString(16) + v2.toString(16), 16)
        // result = (t >> 2 & 0x3FFF) * 0.03125
        let raw_data = event.target.value;

        let temp1 = raw_data.getUint(3).toString(16);
        temp1 = temp1.length < 2 ? '0' + temp1 : temp1;

        let temp2 = raw_data.getUint(2).toString(16);
        temp2 = temp2.length < 2 ? '0' + temp2 : temp2;

        let raw_ambient_temp = parseInt('0x' + temp1 + temp2, 16);
        let ambient_temp_int = raw_ambient_temp >> 2 & 0x3FFF;
        self.temperatureC = ambient_temp_int * 0.03125;
        
        state.tempC = self.temperatureC;
        console.log(self.temperatureC);

        self.onStateChangeCallback(state);
    }

    onStateChangeCallback() {}

    onStateChange(callback){
        self.onStateChangeCallback = callback;
    }
}



// function onScanButtonClick() {
//     let options = {
//         acceptAllDevices: true,
//         optionalServices: [services.deviceInfo.uuid]
//     };

//     navigator.bluetooth.requestDevice(options)
//         .then(device => {
//             console.log(device);
//             console.log('Request Device')
//             return device.gatt.connect();
//         })
//         .then(server => {
//             console.log(server);
//             console.log('Try to get services')
//             return server.getPrimaryService(services.deviceInfo.uuid);
//         })
//         .then(service =>{
//             console.log(service);
//             console.log('Try get characteristic')
//             return service.getCharacteristic(characteristics.deviceInfo.modelName.uuid);
//         })
//         .then(char => {
//             console.log('Got characteristic')
//             console.log(char);
//             return char.readValue();
//         })
//         .then(values => {
//             console.log(values);
//             let temp = '';
//             for (var i = 0; i < 16; i++) {
//                 temp += String.fromCharCode(values.getUint8(i));
//             }
//             console.log(temp);
//         })
//         .catch(error => {
//             console.log('Error: ' + error);
//         });
// }

// Turn data into ambient temperature
// var t = parseInt('0x0be4', 16);

// console.log(t);
// var t2 = t >> 2 & 0x3FFF;
// console.log(t2);
// var t3 = t2 * 0.03125;
// console.log(t3);

// Hex to ASCII
// function hex2a(hexx) {
//     var hex = hexx.toString();//force conversion
//     var str = '';
//     for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
//         str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
//     return str;
// }
