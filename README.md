# E2E solution demonstrating shoulder tap
This NodeJs project demonstrates how to send a shoulder-tap SMS using the AerFrame service provided by Aeris and how to process it on the device side to control the data session. In addition, the project demonstrates how to use AerPort APIs to fetch current network status to find out if the device is in a packet session and make intelligent decisions in the cloud. For simplicity the project assume that cellular is the only connectivity available. The solution can be easily extended to control other interfaces like Wifi or Bluetooth.

The project uses Azure IoT Hub to demonstrate the end-to-end solution, and includes both server-side and client-side code for reference.

Please refer to [Wiki](https://github.com/aerisiot/azure-shouldertap-js/wiki) for full details.

# How to run the device app
See [Test E2E solution](https://github.com/aerisiot/azure-shouldertap-js/wiki/Test-E2E-solution)

# How to run the service app
See [Test E2E solution](https://github.com/aerisiot/azure-shouldertap-js/wiki/Test-E2E-solution)
