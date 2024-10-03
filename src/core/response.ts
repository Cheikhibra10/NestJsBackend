import { StatusCodes } from 'http-status-codes';

export interface RestResponseInterface<T> {
  status: StatusCodes;
  data: T;
  message: string;
}
