import { Doc, Field, Collection, SubCollection } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { InventoryStock } from './inventoryStock'
import { } from "reflect-metadata";



export class SKU extends Doc implements tradable.SKUProtocol<InventoryStock> {
    @Field selledBy!: string
    @Field createdBy!: string
    @Field currency: tradable.Currency = tradable.Currency.JPY
    @Field product!: FirebaseFirestore.DocumentReference
    @Field title!: string
    @Field body!: string
    @Field amount: number = 0
    @Field unitSales: number = 0
    @Field inventory: tradable.Inventory = { type: tradable.StockType.finite, quantity: 1 }
    @Field isOutOfStock: boolean = false
    @Field isAvailabled: boolean = true
    @Field numberOfFetch: number = 2
    
    @SubCollection inventoryStocks: Collection<InventoryStock> = new Collection()
}
