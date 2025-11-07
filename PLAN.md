1. NORMALIZE table DB
   - use product prices from the Product table DB - ✅
   - check/fix type of cart -✅
   - add in the Cart table 'updatedAt' - 👩‍💻
2. Calculate all other prices in the component -✅

3. I will need only userId OR sessionCartId - IN PROGRESS
   on log out - create a new sessionCartId
   on log in - merge 2 carts
   merge the cart - check if it's no userId, insert userId for loged in user

   BUGS:

   - ADD/REMOVE item (logged and not logged user)

4. Cart actions:

   - add checkboxes for not to pay - ✅
   - ADD save for later ✅
   - allow user delete the item from the cart, add deletedAt in the table Cart DB 👩‍💻
   - OUT OF STOCK CASE - notify me when it's available
   - move - ✅
     productId String @db.Uuid
     quantity Int @default(1)
     product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

   TO CART from CartItem
   DELETE the CartItem table

5. Menu Improvements
   Icon with submenu:

   - profile
   - wish-list
   - log out

6. Cart Improvements:

   - estimated shipping ✅
   - leave subtotal for items only ✅
   - fix UI for cart (check Amazon) ✅
   - ### update brand and category in model Product to be enum and then assign different values what I have and will have

     use uuid()

   7. New table Address

      - with userId and primary shipping address - boolean, primary billing address - boolean
      - remove address from the User table

   8. "Continue as a guest" button if the user is not logged in and in the very end ask the user "Do you wanna save the data (...bla bla) - try to make the user sign up/log in to save the order history and so on

   9. If the User wasn't logged in - don't merge the cart, save prev items as 'Saved for later'

   10. Insure I save the successful payment in the Db!!!
