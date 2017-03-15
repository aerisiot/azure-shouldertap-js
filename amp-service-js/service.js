/*

On every socket connection
  - Start a queue listener
    - Check if message is from telemetry, if yes drop it, else write to socket
  - On command
    - get the device id
    - construct message
    - Write it to the queue

    Publish Message to Service Bus and Wait for 10 second for feedback
    Index IP address from ServiceBus for each device (Stretch Goal)
    Fetch IP Address from AerAdmin
    If IP Address from AerAdmin is older than the TTL (5 or 10min) then consider it stale
    If ack received from device then exit
    If no ack from device and IP is stale then send SMS using AerFrame API



*/
