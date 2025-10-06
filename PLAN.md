1. NORMALIZE table DB
   - use product prices from the Product table DB
   - check/fix type of cart
   - add in the Cart table 'updatedAt'
2. Calculate all other prices in the component

3. I will need only userId OR sessionCartId
   on log out - create a new sessionCartId
   on log in - merge 2 carts

4. Cart actions:

   - add checkboxes for not to pay (save for later)
   - allow user delete the item from the cart, add deletedAt in the table Cart DB
   - OUT OF STOCK CASE - notify me when it's available
   - move
     productId String @db.Uuid
     quantity Int @default(1)
     product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

   TO CART from CartItem
   DELETE the CartItem table

merge the cart - check if it's no userId, insert userId for loged in user
