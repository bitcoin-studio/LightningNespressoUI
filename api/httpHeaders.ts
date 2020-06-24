import {Response} from 'express'

export const setNoCache = (res: Response) => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  res.setHeader('Expires', date.toUTCString())
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Cache-Control', 'public, no-cache')
}

export const setLongTermCache = (res: Response) => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  res.setHeader('Expires', date.toUTCString())
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
}
