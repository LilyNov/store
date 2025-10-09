-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "removedItems" JSON[] DEFAULT ARRAY[]::JSON[],
ADD COLUMN     "savedItems" JSON[] DEFAULT ARRAY[]::JSON[];
