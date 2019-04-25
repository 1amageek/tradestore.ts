import { Doc, Field, Collection } from '@1amageek/ballcap-admin'
import { SKU } from './sku'
import { } from "reflect-metadata";

export class Product extends Doc {
    @Field name?: string | undefined;
    @Field caption?: string | undefined;
    @Field SKUs: Collection<SKU> = new Collection()
    @Field selledBy: string = ''
    @Field createdBy: string = ''
    @Field isAvailabled: boolean = false
    @Field isPrivated: boolean = false
}