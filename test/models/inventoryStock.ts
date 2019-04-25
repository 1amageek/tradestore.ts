import { Doc, Field } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import {} from "reflect-metadata"

export class InventoryStock extends Doc implements tradable.InventoryStockProtocol {
    @Field isAvailabled: boolean = true
    @Field SKU!: string
    @Field item?: FirebaseFirestore.DocumentReference
    @Field order?: string
}
