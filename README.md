# tradestore.ts


## Usage

### Inventory

#### SKU
```
/version/1/any_product/:product_id/skus/:sku_id/
```

```typescript
export interface SKUProtocol<Stock extends StockProtocol> extends DocumentType {
    selledBy: string
    createdBy: string
    product?: firebase.firestore.DocumentReference
    currency: Currency
    amount: number
    inventory: Inventory
    isAvailabled: boolean

    /// Maximum number of fetches to acquire at one time
    numberOfFetch: number
    stocks: Collection<Stock>
}
```

#### Stock
```
/version/1/any_product/:product_id/skus/:sku_id/stocks/:stock_id
```

```typescript
export interface StockProtocol extends DocumentType {
    isAvailabled: boolean
    SKU: string
    order?: string
    item?: firebase.firestore.DocumentReference
}
```

### Trade

#### User
```
/version/1/user/:user_id/
```

```typescript
export interface UserProtocol
    <
    Order extends OrderProtocol<OrderItem>,
    OrderItem extends OrderItemProtocol,
    TradeTransaction extends TradeTransactionProtocol
    > extends DocumentType {
    isAvailabled: boolean
    country: string
    orders: Collection<Order>
    receivedOrders: Collection<Order>
    tradeTransactions: Collection<TradeTransaction>
}
```

#### Order
```
/version/1/user/:user_id/orders/:order_id
/version/1/user/:user_id/receivedOrders/:order_id
```

```typescript
export interface OrderProtocol<OrderItem extends OrderItemProtocol> extends DocumentType {
    parentID?: string
    purchasedBy: string
    selledBy: string
    shippingTo: { [key: string]: string }
    transferredTo: { [key: string]: true }
    paidAt?: firebase.firestore.Timestamp
    cancelableDate?: firebase.firestore.Timestamp
    expirationDate?: firebase.firestore.Timestamp
    currency: Currency
    amount: number
    items: OrderItem[]
    paymentStatus: OrderPaymentStatus
    transferStatus: OrderTransferStatus
    transactionResults: TransactionResult[]
    isCancelled: boolean
}
```

#### TradeTransaction
```
/version/1/user/:user_id/tradeTransactions/:tradeTransaction_id
```

```typescript
export interface TradeTransactionProtocol extends DocumentType {
    type: TradeTransactionType
    selledBy: string
    purchasedBy: string
    order: string
    product?: firebase.firestore.DocumentReference
    sku: string
    stock?: string
    item: firebase.firestore.DocumentReference
}
```

### Balance

#### Account
```
/version/1/account/:account_id/
```

```typescript
export interface AccountProtocol<Transaction extends BalanceTransactionProtocol, Payout extends PayoutProtocol> extends DocumentType {
    country: string
    isRejected: boolean
    isSigned: boolean
    balance: Balance
    balanceTransactions: Collection<Transaction>
    payoutRequests: Collection<Payout>
    accountInformation: { [key: string]: any }
}
```

#### Payout
```
/version/1/account/:account_id/payoutRequests/:payoutRequest_id
```

```typescript
export interface PayoutProtocol extends DocumentType {
    account: string
    currency: Currency
    amount: number
    status: PayoutStatus
    transactionResults: TransactionResult[]
    isCancelled: boolean
}
```

#### BalanceTransaction
```
/version/1/account/:account_id/balanceTransactions/:balanceTransaction_id
```

```typescript
export interface BalanceTransactionProtocol extends DocumentType {
    type: BalanceTransactionType
    currency: Currency
    amount: number
    from: AccountOrDestination
    to: AccountOrDestination
    order?: string
    transfer?: string
    payout?: string
    transactionResults: TransactionResult[]
}
```
