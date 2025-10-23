const { PrismaClient } = require("@prisma/client");
const sampleData = require("./sample-data").default || require("./sample-data");

async function main() {
  const prisma = new PrismaClient();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();

  const categoryMap = {}; // name -> id
  const brandMap = {}; // name -> id

  for (const p of sampleData.products) {
    if (!categoryMap[p.category]) {
      const cat = await prisma.category.create({ data: { name: p.category } });
      categoryMap[p.category] = cat.id;
    }
    if (!brandMap[p.brand]) {
      const br = await prisma.brand.create({ data: { name: p.brand } });
      brandMap[p.brand] = br.id;
    }
  }

  await prisma.product.createMany({
    data: sampleData.products.map((p) => ({
      name: p.name,
      slug: p.slug,
      images: p.images,
      description: p.description,
      stock: p.stock,
      price: p.price,
      rating: p.rating,
      numReviews: p.numReviews,
      isFeatured: p.isFeatured,
      banner: p.banner,
      categoryId: categoryMap[p.category],
      brandId: brandMap[p.brand],
    })),
  });

  console.log("Seed completed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
