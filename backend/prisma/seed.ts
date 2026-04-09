import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de dados de teste...\n');

  // 1. Empresa de teste
  const company = await prisma.company.create({
    data: {
      name: 'Studio Teste LTDA',
      email: 'teste@finnix.com',
      document: '12.345.678/0001-90',
      phone: '(11) 99999-0000',
    },
  });
  console.log(`✅ Empresa criada: ${company.name}`);

  // 2. Usuário admin
  const passwordHash = await bcrypt.hash('senha123', 10);
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Administrador',
      email: 'admin@teste.com',
      passwordHash,
      role: 'ADMIN',
      phone: '(11) 99999-0001',
    },
  });
  console.log(`✅ Usuário admin criado: ${user.email} / senha123`);

  // 3. Categorias
  const categoriesData = [
    { name: 'Vendas', type: 'INCOME' as const, color: '#22c55e', icon: 'trending-up' },
    { name: 'Serviços', type: 'INCOME' as const, color: '#3b82f6', icon: 'briefcase' },
    { name: 'Alimentação', type: 'EXPENSE' as const, color: '#f97316', icon: 'utensils' },
    { name: 'Transporte', type: 'EXPENSE' as const, color: '#eab308', icon: 'car' },
    { name: 'Marketing', type: 'EXPENSE' as const, color: '#ec4899', icon: 'megaphone' },
    { name: 'Fornecedores', type: 'EXPENSE' as const, color: '#8b5cf6', icon: 'truck' },
  ];

  const categories = await Promise.all(
    categoriesData.map((c) =>
      prisma.category.create({
        data: { companyId: company.id, ...c },
      }),
    ),
  );
  console.log(`✅ ${categories.length} categorias criadas`);

  // 4. Segmentos
  const segmentsData = [
    { name: 'Loja Física', color: '#8DFF6B', icon: 'store' },
    { name: 'Shopee', color: '#FF6B9D', icon: 'shopping-bag' },
    { name: 'Instagram', color: '#FFB86B', icon: 'instagram' },
  ];

  const segments = await Promise.all(
    segmentsData.map((s) =>
      prisma.segment.create({
        data: { companyId: company.id, ...s },
      }),
    ),
  );
  console.log(`✅ ${segments.length} segmentos criados`);

  // 5. Contas bancárias
  const accountsData = [
    { name: 'Bradesco CC', type: 'CHECKING' as const, bankCode: '237', initialBalance: 5000 },
    { name: 'Nubank PJ', type: 'CHECKING' as const, bankCode: '260', initialBalance: 2500 },
    { name: 'Dinheiro em Caixa', type: 'CASH' as const, bankCode: null, initialBalance: 800 },
  ];

  const accounts = await Promise.all(
    accountsData.map((a) =>
      prisma.bankAccount.create({
        data: {
          companyId: company.id,
          name: a.name,
          type: a.type,
          bankCode: a.bankCode,
          initialBalance: a.initialBalance,
          currentBalance: a.initialBalance,
        },
      }),
    ),
  );
  console.log(`✅ ${accounts.length} contas bancárias criadas`);

  // 6. Clientes
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        companyId: company.id,
        name: 'João Silva',
        document: '123.456.789-00',
        email: 'joao@email.com',
        phone: '(11) 98888-1111',
      },
    }),
    prisma.client.create({
      data: {
        companyId: company.id,
        name: 'Maria Souza',
        email: 'maria@email.com',
        phone: '(11) 98888-2222',
      },
    }),
  ]);
  console.log(`✅ ${clients.length} clientes criados`);

  // 7. Fornecedores
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        companyId: company.id,
        name: 'Distribuidora Alfa',
        document: '98.765.432/0001-10',
        email: 'contato@alfa.com',
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: company.id,
        name: 'Papelaria Beta',
        document: '11.222.333/0001-44',
        email: 'vendas@beta.com',
      },
    }),
  ]);
  console.log(`✅ ${suppliers.length} fornecedores criados`);

  // 8. Transações dos últimos 30 dias
  const incomeDescriptions = [
    'Venda no Instagram',
    'Venda na Shopee - Camiseta',
    'Serviço de consultoria',
    'Venda balcão loja física',
    'Comissão de indicação',
    'Venda online - Kit Presente',
    'Serviço de design gráfico',
    'Venda de produto personalizado',
    'Consultoria financeira',
    'Venda atacado - lote de camisetas',
  ];

  const expenseDescriptions = [
    'Uber para reunião com cliente',
    'Almoço com cliente',
    'Anúncio Facebook Ads',
    'Material de escritório',
    'Compra de matéria-prima',
    'Frete de mercadorias',
    'Conta de energia do estúdio',
    'Assinatura de software',
    'Impulsionamento Instagram',
    'Embalagens para envio',
    'Manutenção do ar condicionado',
    'Gasolina veículo comercial',
    'Papel e toner impressora',
    'Café e lanches para reunião',
    'Taxa de marketplace Shopee',
  ];

  const now = new Date();
  let totalIncome = 0;
  let totalExpense = 0;
  let createdCount = 0;

  // Categorias separadas por tipo
  const incomeCategories = categories.filter(
    (c) => c.type === 'INCOME',
  );
  const expenseCategories = categories.filter(
    (c) => c.type === 'EXPENSE',
  );

  for (let i = 0; i < 30; i++) {
    // Data da transação: entre 0 e 30 dias atrás
    const daysAgo = Math.floor(Math.random() * 30);
    const txDate = new Date(now);
    txDate.setDate(txDate.getDate() - daysAgo);

    // Decide tipo: ~45% INCOME, ~55% EXPENSE
    const isIncome = Math.random() < 0.45;
    const type = isIncome ? 'INCOME' : 'EXPENSE';

    // Valor entre R$ 15 e R$ 2500
    const amount = Math.round((15 + Math.random() * 2485) * 100) / 100;

    // Descrição aleatória
    const descriptions = isIncome ? incomeDescriptions : expenseDescriptions;
    const descIndex = Math.floor(Math.random() * descriptions.length);
    const description = descriptions[descIndex] ?? 'Transação genérica';

    // Categoria aleatória do tipo correto
    const catList = isIncome ? incomeCategories : expenseCategories;
    const catIndex = Math.floor(Math.random() * catList.length);
    const category = catList[catIndex];

    // Segmento aleatório (70% das vezes)
    const segIndex = Math.floor(Math.random() * segments.length);
    const segment = Math.random() < 0.7 ? segments[segIndex] : undefined;

    // Conta bancária aleatória (80% das vezes)
    const accIndex = Math.floor(Math.random() * accounts.length);
    const account = Math.random() < 0.8 ? accounts[accIndex] : undefined;

    // Cliente ou fornecedor
    const clientIndex = Math.floor(Math.random() * clients.length);
    const client = isIncome && Math.random() < 0.5 ? clients[clientIndex] : undefined;
    const supplierIndex = Math.floor(Math.random() * suppliers.length);
    const supplier = !isIncome && Math.random() < 0.4 ? suppliers[supplierIndex] : undefined;

    // Status: 70% PAID, 20% PENDING, 10% OVERDUE
    const statusRoll = Math.random();
    let status: 'PAID' | 'PENDING' | 'OVERDUE';
    if (statusRoll < 0.7) {
      status = 'PAID';
    } else if (statusRoll < 0.9) {
      status = 'PENDING';
    } else {
      status = 'OVERDUE';
    }

    // dueDate: 5 dias após a data da transação
    const dueDate = new Date(txDate);
    dueDate.setDate(dueDate.getDate() + 5);

    // Para OVERDUE, o dueDate deve ser no passado
    const overdueDueDate = new Date(now);
    overdueDueDate.setDate(overdueDueDate.getDate() - Math.floor(Math.random() * 10 + 1));

    const paymentDate = status === 'PAID' ? txDate : undefined;

    const transaction = await prisma.transaction.create({
      data: {
        companyId: company.id,
        userId: user.id,
        type,
        amount,
        description,
        date: txDate,
        dueDate: status === 'OVERDUE' ? overdueDueDate : dueDate,
        paymentDate,
        status,
        categoryId: category?.id,
        clientId: client?.id,
        supplierId: supplier?.id,
        segmentId: segment?.id,
        tags: [],
        source: 'MANUAL',
      },
    });

    // Cria AccountTransaction se tiver conta bancária e for PAID ou OVERDUE
    if (account && (status === 'PAID' || status === 'OVERDUE')) {
      await prisma.accountTransaction.create({
        data: {
          transactionId: transaction.id,
          accountId: account.id,
        },
      });
    }

    if (isIncome) {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
    createdCount++;
  }

  console.log(`\n✅ ${createdCount} transações criadas`);
  console.log(`   💰 Total receitas: R$ ${totalIncome.toFixed(2)}`);
  console.log(`   💸 Total despesas: R$ ${totalExpense.toFixed(2)}`);
  console.log(`   📊 Balanço: R$ ${(totalIncome - totalExpense).toFixed(2)}`);
  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('   Login: admin@teste.com / senha123');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
