import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Promove admin@teste.com para SUPER_ADMIN
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@teste.com' },
  });
  if (!adminUser) throw new Error('admin@teste.com não encontrado');

  const admin = await prisma.user.update({
    where: { id: adminUser.id },
    data: { role: 'SUPER_ADMIN' },
  });
  console.log(`admin promovido: ${admin.email} -> ${admin.role}`);

  // 2. Cria empresa + usuário cliente (ou reusa se já existir)
  const existingClient = await prisma.user.findFirst({
    where: { email: 'cliente@teste.com' },
  });

  if (existingClient) {
    console.log(`cliente ja existe: ${existingClient.email}`);
    return;
  }

  const clientCompany = await prisma.company.create({
    data: {
      name: 'Empresa Cliente Demo',
      email: 'contato@clientedemo.com',
      document: '11.222.333/0001-44',
      phone: '(11) 98888-0000',
    },
  });

  const hash = await bcrypt.hash('senha123', 10);
  const clientUser = await prisma.user.create({
    data: {
      companyId: clientCompany.id,
      name: 'Cliente Demo',
      email: 'cliente@teste.com',
      passwordHash: hash,
      role: 'USER',
      phone: '(11) 98888-1111',
    },
  });
  console.log(`cliente criado: ${clientUser.email} / senha123`);

  // 3. Categorias e conta básicas pro cliente ter dados
  await prisma.category.createMany({
    data: [
      {
        companyId: clientCompany.id,
        name: 'Receitas',
        type: 'INCOME',
        color: '#22c55e',
        icon: 'trending-up',
      },
      {
        companyId: clientCompany.id,
        name: 'Alimentação',
        type: 'EXPENSE',
        color: '#f97316',
        icon: 'utensils',
      },
      {
        companyId: clientCompany.id,
        name: 'Transporte',
        type: 'EXPENSE',
        color: '#eab308',
        icon: 'car',
      },
    ],
  });

  await prisma.bankAccount.create({
    data: {
      companyId: clientCompany.id,
      name: 'Conta Principal',
      type: 'CHECKING',
      initialBalance: 1000,
      currentBalance: 1000,
    },
  });
  console.log('categorias e conta do cliente criadas');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
