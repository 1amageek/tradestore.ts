import { Doc, Field, Collection, SubCollection, DocumentReference } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { Stock } from './stock'
import { } from "reflect-metadata";



export class SKU extends Doc implements tradable.SKUProtocol<Stock> {
    @Field selledBy!: string
    @Field createdBy!: string
    @Field currency: tradable.Currency = tradable.Currency.JPY
    @Field productReference!: DocumentReference
    @Field title!: string
    @Field body!: string
    @Field amount: number = 0
    @Field unitSales: number = 0
    @Field inventory: tradable.Inventory = { type: tradable.StockType.finite, quantity: 1 }
    @Field isOutOfStock: boolean = false
    @Field isAvailable: boolean = true
    @Field numberOfFetch: number = 2

    @SubCollection stocks: Collection<Stock> = new Collection()
}
