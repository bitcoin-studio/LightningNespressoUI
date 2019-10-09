import EventEmitter from 'events';
import {Invoice} from '@radar/lnrpc'

class Manager extends EventEmitter {
  constructor() {
    super()
  }

  // Emit 'invoice-settlement' event
  handleInvoiceSettlement(invoice: Invoice) {
    console.log('Emit invoice-settlement event')
    this.emit('invoice-settlement', invoice)
  }
}

const manager = new Manager();
export default manager;