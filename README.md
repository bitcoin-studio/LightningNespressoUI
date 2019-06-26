# Nespresso Capsule Vending Machine over Lightning Network

## What is it?
A 3D printed / laser cutted vending machine made by [Yoctopuce](http://www.yoctopuce.com/EN/article/an-automatic-nespresso-capsule-dispenser)
and customized with the help of the [MILL FabLab](www.mill.pt) and [Monica Pedro](https://www.linkedin.com/in/monicacpedro/).

This repository is the client code for the simple server version of [LightningNespressoServer](https://github.com/bitcoin-studio/LightningNespressoServer).

The server is using [lnrpc](https://github.com/RadarTech/lnrpc), a typed gRPC client for LND, to connect to the merchant 
node, producing BOLT 11 Lightning Network invoices. 

When an invoice is paid, the server notifies the client via websocket and sends a request to the vending machine which delivers the Nespresso capsule.


## See also  
- The vending machine code: [LightningNespressoServer](https://github.com/bitcoin-studio/LightningNespressoServer)
- The 3D printed / laser cutted vending machine: [Yoctopuce](http://www.yoctopuce.com/EN/article/an-automatic-nespresso-capsule-dispenser)