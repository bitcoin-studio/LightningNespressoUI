import { EventEmitter } from 'events';
//import {ICoffee} from '../client/types';
import {Invoice} from '@radar/lnrpc'

// All logic and storage around posts happens in here. To keep things simple,
// we're just storing posts in memory. Every time you restart the server, all
// posts will be lost. For long term storage, you'd want to look into putting
// these into a database.


class Manager extends EventEmitter {
  //coffees: ICoffee[] = [];

  constructor() {
    super()
  }

  // Emit 'invoice-settlement' event
  // used in server/index.ts
  handleInvoiceSettlement(invoice: Invoice) {
    this.emit('invoice-settlement', invoice)
  }


  // Mark a coffee as paid
  /*
  markCoffeePaid(id: number) {
    console.log('markCoffeePaidmarkCoffeePaidmarkCoffeePaidmarkCoffeePaidmarkCoffeePaidmarkCoffeePaid')
    let updatedCoffees;
    this.coffees = this.coffees.map(p => {
      console.log('id ----------', id)
      console.log('coffee --- ', p)
      if (p.id === id) {
        updatedCoffees = { ...p, hasPaid: true };
        return updatedCoffees;
      }
      return p;
    });

    if (updatedCoffees) {
      this.emit('coffee', updatedCoffees);
    }
    this.emit('invoice-settlement', 'test_arg');
  }
  */
}

const manager = new Manager();
export default manager;