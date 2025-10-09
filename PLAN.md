1. NORMALIZE table DB
   - use product prices from the Product table DB - DONE
   - check/fix type of cart -DONE
   - add in the Cart table 'updatedAt' - IN PROGRESS
2. Calculate all other prices in the component -DONE

3. I will need only userId OR sessionCartId - IN PROGRESS
   on log out - create a new sessionCartId
   on log in - merge 2 carts
   merge the cart - check if it's no userId, insert userId for loged in user

   BUGS:

   - ADD/REMOVE item (logged and not logged user)

4. Cart actions:

   - add checkboxes for not to pay - IN PROGRESS
   - ADD save for later
   - allow user delete the item from the cart, add deletedAt in the table Cart DB
   - OUT OF STOCK CASE - notify me when it's available
   - move - DONE
     productId String @db.Uuid
     quantity Int @default(1)
     product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

   TO CART from CartItem
   DELETE the CartItem table

5. Icon with submenu:
   - profile
   - wish-list
   - log out

estemated shiping
leave subtotal for items only
fix UI for cart (check Amazon)
