# Nespresso Capsule Vending Machine over Lightning Network

## What is it?
This repository is part of a Do-It-Yourself vending machine project which connects to a Bitcoin point of sales terminal.  
Select your coffee, pay with Bitcoin (via Lightning Network), and the vending machine will deliver your Nespresso capsule.

This repository is the Bitcoin point of sale terminal code for the simple non-BTCPay version of [LightningNespressoServer](https://github.com/bitcoin-studio/LightningNespressoServer).

The server of this web application is using [lnrpc](https://github.com/RadarTech/lnrpc), a Typescript gRPC client for LND that 
allows us to connect to a Bitcoin/LND node and produce BOLT 11 Lightning Network invoices. 

When an invoice is paid, the server notifies the client via websocket and sends a request to the vending machine which delivers the Nespresso capsule.


## See also  
- The point of sale website: [https://coffee.bitcoin-studio.com](https://coffee.bitcoin-studio.com)
- The vending machine code: [LightningNespressoServer](https://github.com/bitcoin-studio/LightningNespressoServer)
- The 3D printed / laser cutted vending machine: [CAD files](https://www.thingiverse.com/thing:3772726)
- A description of the project: [Bitcoin Studio website](https://www.bitcoin-studio.com/resources)