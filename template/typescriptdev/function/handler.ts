import {Response} from 'express'
type Cb = (err: Error | undefined, functionResult?: any) => Response
interface IFunctionContext {
  value: number;
  cb: Cb;
  headerValues: {};
  cbCalled: number;
  headers: () => any;
  status: (value?: number) => any;
  succeed: (value: any) => void;
  fail: (value: Error) => any;
}

export default async (event: {body: any}, context: IFunctionContext, cb?: Cb) => {
  const result = {
    status: `Received input: ${JSON.stringify(event.body)}`
  }

  return context
    .status(200)
    .succeed(result)
}