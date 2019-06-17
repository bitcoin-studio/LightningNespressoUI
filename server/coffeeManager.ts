import { EventEmitter } from 'events';
import {ICoffee} from '../client/types';

// All logic and storage around posts happens in here. To keep things simple,
// we're just storing posts in memory. Every time you restart the server, all
// posts will be lost. For long term storage, you'd want to look into putting
// these into a database.

class CoffeeManager extends EventEmitter {
  coffees: ICoffee[] = [];

  // Mark a coffee as paid
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

    /*
    if (updatedCoffees) {
      this.emit('coffee', updatedCoffees);
    }
    */
    this.emit('invoice', 'paid');
  }
}

export default new CoffeeManager();