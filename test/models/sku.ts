import { Doc, Field, Collection, SubCollection, DocumentReference } from '@1amageek/ballcap-admin'
import { Currency, SKUProtocol, Inventory, StockType } from '../../src/index'
import { Stock } from './stock'
import { } from "reflect-metadata";



export class SKU extends Doc implements SKUProtocol<Stock> {
    @Field selledBy!: string
    @Field createdBy!: string
    @Field currency: Currency = Currency.JPY
    @Field productReference!: DocumentReference
    @Field title!: string
    @Field body!: string
    @Field amount: number = 0
    @Field unitSales: number = 0
    @Field inventory: Inventory = { type: StockType.finite, quantity: 1 }
    @Field isOutOfStock: boolean = false
    @Field isAvailable: boolean = true
    @Field numberOfFetch: number = 2

    @SubCollection stocks: Collection<Stock> = new Collection()
}
