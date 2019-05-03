import { Doc, Field, DocumentReference } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import {} from "reflect-metadata"

export class Stock extends Doc implements tradable.StockProtocol {
    @Field isAvailabled: boolean = true
    @Field itemReference?: DocumentReference
    @Field orderReference?: DocumentReference
}
