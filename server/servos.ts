/**
 * servoWrite(pulseWidth)
 * pulseWidth - pulse width in microseconds, an unsigned integer, 0 or a number in the range 500 through 2500
 * Starts servo pulses at 50Hz on the GPIO, 0 (off), 500 (most anti-clockwise) to 2500 (most clockwise). Returns this.
 * https://github.com/fivdi/pigpio/blob/master/doc/gpio.md#servowritepulsewidth
 */

import {Gpio} from 'pigpio'
import log from 'loglevel'

const motor1 = new Gpio(26, {mode: Gpio.OUTPUT})
const motor2 = new Gpio(19, {mode: Gpio.OUTPUT})
const motor3 = new Gpio(13, {mode: Gpio.OUTPUT})
const motor4 = new Gpio(6, {mode: Gpio.OUTPUT})
const motor5 = new Gpio(5, {mode: Gpio.OUTPUT})

const getMotor = (pin: number) => {
  switch (pin) {
    case 1: {
      return motor1
    }
    case 2: {
      return motor2
    }
    case 3: {
      return motor3
    }
    case 4: {
      return motor4
    }
    case 5: {
      return motor5
    }
    default: {
      log.error('An incorrect servo pin has been provided')
      return null
    }
  }
}

const closePosition = 700
const openPosition = 2300
const increment = 100

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function activateServo(pin: number) {
  // Open
  // Starts from close position
  let pulseWidth = closePosition
  log.info(`Open servo pin ${pin}`)
  while (pulseWidth !== openPosition + increment) {
    log.debug('pulseWidth', pulseWidth)
    getMotor(pin)?.servoWrite(pulseWidth)
    // eslint-disable-next-line no-await-in-loop
    await sleep(25)
    pulseWidth += increment
  }
  log.info(`Servo pin ${pin} is open`)

  // Close
  // Starts from open position
  pulseWidth = openPosition
  while (pulseWidth !== closePosition - increment) {
    log.debug('pulseWidth', pulseWidth)
    getMotor(pin)?.servoWrite(pulseWidth)
    // eslint-disable-next-line no-await-in-loop
    await sleep(25)
    pulseWidth -= increment
  }
  log.info(`Servo pin ${pin} is close`)

  // Turn off
  log.info('Turn off')
  getMotor(pin)?.servoWrite(0)
}

export {
  activateServo
}
