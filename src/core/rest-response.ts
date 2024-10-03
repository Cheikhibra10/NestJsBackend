import { StatusCodes } from 'http-status-codes';
import { RestResponseInterface } from './response';

export default class RestResponse {
  static response<T>(data: T, httpCode: StatusCodes, message: string = 'Traitement effectué avec succès'): RestResponseInterface<T> {
    return {
      status: httpCode,
      data,
      message
    } as RestResponseInterface<T>;
  }
}
