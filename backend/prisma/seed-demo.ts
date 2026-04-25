import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'damasojuliano@gmail.com';
const DEMO_PASSWORD = 'demo123';
const DEMO_PHONE = '(11) 97777-0007';

type Cat = { name: string; type: 'INCOME' | 'EXPENSE'; color: string; icon: string };
type Seg = { name: string; color: string; icon: string };
type Acc = { name: string; type: 'CHECKING' | 'SAVINGS' | 'CASH'; bankCode: string | null; initialBalance: number };

const CATEGORIES: Cat[] = [
  { name: 'Vendas Online', type: 'INCOME', color: '#22c55e', icon: 'shopping-cart' },
  { name: 'Vendas Loja', type: 'INCOME', color: '#16a34a', icon: 'store' },
  { name: 'Serviços', type: 'INCOME', color: '#3b82f6', icon: 'briefcase' },
  { name: 'Comissões', type: 'INCOME', color: '#06b6d4', icon: 'percent' },
  { name: 'Marketing', type: 'EXPENSE', color: '#ec4899', icon: 'megaphone' },
  { name: 'Fornecedores', type: 'EXPENSE', color: '#8b5cf6', icon: 'truck' },
  { name: 'Aluguel', type: 'EXPENSE', color: '#f97316', icon: 'home' },
  { name: 'Funcionários', type: 'EXPENSE', color: '#ef4444', icon: 'users' },
  { name: 'Energia & Internet', type: 'EXPENSE', color: '#eab308', icon: 'zap' },
  { name: 'Logística', type: 'EXPENSE', color: '#a855f7', icon: 'package' },
  { name: 'Software & Assinaturas', type: 'EXPENSE', color: '#14b8a6', icon: 'laptop' },
];

const SEGMENTS: Seg[] = [
  { name: 'Loja Física', color: '#8DFF6B', icon: 'store' },
  { name: 'Shopee', color: '#FF6B9D', icon: 'shopping-bag' },
  { name: 'Instagram', color: '#FFB86B', icon: 'instagram' },
  { name: 'Mercado Livre', color: '#6BC9FF', icon: 'shopping-cart' },
];

const ACCOUNTS: Acc[] = [
  { name: 'Bradesco PJ', type: 'CHECKING', bankCode: '237', initialBalance: 18500 },
  { name: 'Nubank PJ', type: 'CHECKING', bankCode: '260', initialBalance: 9200 },
  { name: 'Caixa Loja', type: 'CASH', bankCode: null, initialBalance: 1850 },
];

const CLIENTS = [
  { name: 'Ana Costa', email: 'ana@email.com', phone: '(11) 98888-1001' },
  { name: 'Pedro Henrique', email: 'pedro@email.com', phone: '(11) 98888-1002' },
  { name: 'Camila Ribeiro', email: 'camila@email.com', phone: '(11) 98888-1003' },
  { name: 'Rafael Mendes', email: 'rafael@email.com', phone: '(11) 98888-1004' },
  { name: 'Juliana Alves', email: 'juliana@email.com', phone: '(11) 98888-1005' },
  { name: 'Lucas Fernandes', email: 'lucas@email.com', phone: '(11) 98888-1006' },
];

const SUPPLIERS = [
  { name: 'Distribuidora Alfa', document: '12.111.222/0001-10', email: 'contato@alfa.com' },
  { name: 'Têxtil Brasil', document: '23.222.333/0001-20', email: 'vendas@textilbr.com' },
  { name: 'Embalagens Pro', document: '34.333.444/0001-30', email: 'comercial@embalagenspro.com' },
  { name: 'Papelaria Beta', document: '45.444.555/0001-40', email: 'vendas@beta.com' },
];

const INCOME_DESCRIPTIONS: Record<string, string[]> = {
  'Vendas Online': [
    'Venda na Shopee — Camiseta básica',
    'Venda Mercado Livre — Kit promo',
    'Venda Instagram — Conjunto exclusivo',
    'Venda Shopee — Lote camisetas',
    'Venda Instagram — Caneca personalizada',
  ],
  'Vendas Loja': [
    'Venda balcão — Camiseta',
    'Venda balcão — Kit presente',
    'Venda loja — Cliente VIP',
    'Venda loja — Acessórios',
  ],
  'Serviços': [
    'Consultoria de identidade visual',
    'Design de embalagem',
    'Serviço de personalização',
    'Consultoria de marca',
  ],
  'Comissões': [
    'Comissão de indicação parceiro',
    'Comissão de afiliado',
  ],
};

const EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  'Marketing': [
    'Anúncio Facebook Ads',
    'Impulsionamento Instagram',
    'Tráfego pago Google',
    'Influenciador parceria',
  ],
  'Fornecedores': [
    'Compra de matéria-prima',
    'Pedido lote camisetas',
    'Reposição de estoque',
  ],
  'Aluguel': [
    'Aluguel da loja física',
    'Condomínio loja',
  ],
  'Funcionários': [
    'Salário Carla — vendedora',
    'Salário Bruno — designer',
    'Vale transporte equipe',
  ],
  'Energia & Internet': [
    'Conta de energia',
    'Internet fibra loja',
    'Conta de água',
  ],
  'Logística': [
    'Frete Correios',
    'Embalagens para envio',
    'Logística reversa',
  ],
  'Software & Assinaturas': [
    'Assinatura Canva Pro',
    'Adobe Creative Cloud',
    'Hospedagem do site',
    'Plataforma de e-commerce',
  ],
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function main() {
  console.log(`\n🌱 Seed DEMO para ${DEMO_EMAIL}\n`);

  // === 1. Procura ou cria empresa ===
  let company = await prisma.company.findUnique({ where: { email: DEMO_EMAIL } });

  if (company) {
    console.log(`♻️  Empresa existente encontrada: ${company.name} (${company.id})`);
    console.log('   Limpando dados antigos pra recriar do zero...');

    // Apaga em ordem respeitando FKs
    await prisma.accountTransaction.deleteMany({
      where: { transaction: { companyId: company.id } },
    });
    await prisma.transaction.deleteMany({ where: { companyId: company.id } });
    await prisma.budget.deleteMany({ where: { companyId: company.id } });
    await prisma.investment.deleteMany({ where: { companyId: company.id } });
    await prisma.goalContribution.deleteMany({
      where: { goal: { companyId: company.id } },
    });
    await prisma.goal.deleteMany({ where: { companyId: company.id } });
    await prisma.invoice.deleteMany({ where: { companyId: company.id } });
    await prisma.creditCard.deleteMany({ where: { companyId: company.id } });
    await prisma.client.deleteMany({ where: { companyId: company.id } });
    await prisma.supplier.deleteMany({ where: { companyId: company.id } });
    await prisma.bankAccount.deleteMany({ where: { companyId: company.id } });
    await prisma.segment.deleteMany({ where: { companyId: company.id } });
    await prisma.category.deleteMany({ where: { companyId: company.id } });
    await prisma.alert.deleteMany({ where: { companyId: company.id } });
    await prisma.whatsAppMessage.deleteMany({ where: { companyId: company.id } });
  } else {
    company = await prisma.company.create({
      data: {
        name: 'Damaso Studio Demo',
        email: DEMO_EMAIL,
        document: '12.345.678/0001-99',
        phone: '(11) 97777-0000',
        plan: 'PRO',
      },
    });
    console.log(`✅ Empresa criada: ${company.name}`);
  }

  // === 2. Usuário ===
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existingUser = await prisma.user.findFirst({
    where: { companyId: company.id, email: DEMO_EMAIL },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash, role: 'SUPER_ADMIN', isActive: true, name: 'Juliano Damaso' },
      })
    : await prisma.user.create({
        data: {
          companyId: company.id,
          name: 'Juliano Damaso',
          email: DEMO_EMAIL,
          passwordHash,
          role: 'SUPER_ADMIN',
          phone: DEMO_PHONE,
        },
      });
  console.log(`✅ Usuário: ${user.email} (senha: ${DEMO_PASSWORD})`);

  // === 3. Categorias ===
  const categories = await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.create({ data: { companyId: company!.id, ...c } }),
    ),
  );
  console.log(`✅ ${categories.length} categorias`);

  // === 4. Segmentos ===
  const segments = await Promise.all(
    SEGMENTS.map((s) =>
      prisma.segment.create({ data: { companyId: company!.id, ...s } }),
    ),
  );
  console.log(`✅ ${segments.length} segmentos`);

  // === 5. Contas bancárias ===
  const accounts = await Promise.all(
    ACCOUNTS.map((a) =>
      prisma.bankAccount.create({
        data: {
          companyId: company!.id,
          name: a.name,
          type: a.type,
          bankCode: a.bankCode,
          initialBalance: a.initialBalance,
          currentBalance: a.initialBalance,
        },
      }),
    ),
  );
  console.log(`✅ ${accounts.length} contas bancárias`);

  // === 6. Clientes ===
  const clients = await Promise.all(
    CLIENTS.map((c) =>
      prisma.client.create({ data: { companyId: company!.id, ...c } }),
    ),
  );
  console.log(`✅ ${clients.length} clientes`);

  // === 7. Fornecedores ===
  const suppliers = await Promise.all(
    SUPPLIERS.map((s) =>
      prisma.supplier.create({ data: { companyId: company!.id, ...s } }),
    ),
  );
  console.log(`✅ ${suppliers.length} fornecedores`);

  // === 8. Transações dos últimos 90 dias ===
  // Mais densas no mês atual pros gráficos ficarem bonitos
  const now = new Date();
  const incomeCats = categories.filter((c) => c.type === 'INCOME');
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');

  type TxConfig = { daysAgo: number; type: 'INCOME' | 'EXPENSE'; amount: number; categoryName: string; segmentName?: string; clientIdx?: number; supplierIdx?: number; status?: 'PAID' | 'PENDING' | 'OVERDUE' };

  const fixedTransactions: TxConfig[] = [
    // Despesas fixas mensais — últimos 3 meses
    { daysAgo: 5, type: 'EXPENSE', amount: 3500, categoryName: 'Aluguel', status: 'PAID' },
    { daysAgo: 35, type: 'EXPENSE', amount: 3500, categoryName: 'Aluguel', status: 'PAID' },
    { daysAgo: 65, type: 'EXPENSE', amount: 3500, categoryName: 'Aluguel', status: 'PAID' },
    { daysAgo: 7, type: 'EXPENSE', amount: 2200, categoryName: 'Funcionários', status: 'PAID' },
    { daysAgo: 37, type: 'EXPENSE', amount: 2200, categoryName: 'Funcionários', status: 'PAID' },
    { daysAgo: 67, type: 'EXPENSE', amount: 2200, categoryName: 'Funcionários', status: 'PAID' },
    { daysAgo: 7, type: 'EXPENSE', amount: 2800, categoryName: 'Funcionários', status: 'PAID' },
    { daysAgo: 37, type: 'EXPENSE', amount: 2800, categoryName: 'Funcionários', status: 'PAID' },
    { daysAgo: 67, type: 'EXPENSE', amount: 2800, categoryName: 'Funcionários', status: 'PAID' },
    { daysAgo: 12, type: 'EXPENSE', amount: 480, categoryName: 'Energia & Internet', status: 'PAID' },
    { daysAgo: 42, type: 'EXPENSE', amount: 510, categoryName: 'Energia & Internet', status: 'PAID' },
    { daysAgo: 72, type: 'EXPENSE', amount: 460, categoryName: 'Energia & Internet', status: 'PAID' },
    { daysAgo: 3, type: 'EXPENSE', amount: 89, categoryName: 'Software & Assinaturas', status: 'PAID' },
    { daysAgo: 33, type: 'EXPENSE', amount: 89, categoryName: 'Software & Assinaturas', status: 'PAID' },
    { daysAgo: 63, type: 'EXPENSE', amount: 89, categoryName: 'Software & Assinaturas', status: 'PAID' },

    // Pendentes pra próxima semana (a vencer)
    { daysAgo: -3, type: 'EXPENSE', amount: 380, categoryName: 'Energia & Internet', status: 'PENDING' },
    { daysAgo: -5, type: 'EXPENSE', amount: 1200, categoryName: 'Fornecedores', supplierIdx: 0, status: 'PENDING' },
    { daysAgo: -2, type: 'INCOME', amount: 850, categoryName: 'Serviços', clientIdx: 1, status: 'PENDING' },

    // Vencidas
    { daysAgo: 8, type: 'EXPENSE', amount: 320, categoryName: 'Marketing', status: 'OVERDUE' },
    { daysAgo: 4, type: 'INCOME', amount: 450, categoryName: 'Serviços', clientIdx: 3, status: 'OVERDUE' },
  ];

  const segByName = (n: string) => segments.find((s) => s.name === n);
  const catByName = (n: string) => categories.find((c) => c.name === n);

  let totalIncome = 0;
  let totalExpense = 0;
  let createdCount = 0;

  // Cria as fixas primeiro
  for (const cfg of fixedTransactions) {
    const date = new Date(now);
    date.setDate(date.getDate() - cfg.daysAgo);

    const dueDate = new Date(date);
    if (cfg.status === 'PENDING') {
      // dueDate no futuro
    } else if (cfg.status === 'OVERDUE') {
      dueDate.setDate(date.getDate() - 3);
    } else {
      dueDate.setDate(date.getDate() + 5);
    }

    const cat = catByName(cfg.categoryName);
    const descriptions = cfg.type === 'INCOME'
      ? INCOME_DESCRIPTIONS[cfg.categoryName] ?? [`${cfg.categoryName} — receita`]
      : EXPENSE_DESCRIPTIONS[cfg.categoryName] ?? [`${cfg.categoryName} — despesa`];

    const segment = cfg.segmentName ? segByName(cfg.segmentName) : undefined;
    const account = pick(accounts);

    const tx = await prisma.transaction.create({
      data: {
        companyId: company.id,
        userId: user.id,
        type: cfg.type,
        amount: cfg.amount,
        description: pick(descriptions),
        date,
        dueDate,
        paymentDate: cfg.status === 'PAID' ? date : undefined,
        status: cfg.status ?? 'PAID',
        categoryId: cat?.id,
        segmentId: segment?.id,
        clientId: cfg.clientIdx !== undefined ? clients[cfg.clientIdx]?.id : undefined,
        supplierId: cfg.supplierIdx !== undefined ? suppliers[cfg.supplierIdx]?.id : undefined,
        tags: [],
        source: 'MANUAL',
      },
    });

    if (cfg.status === 'PAID') {
      await prisma.accountTransaction.create({
        data: { transactionId: tx.id, accountId: account.id },
      });
    }

    if (cfg.type === 'INCOME' && cfg.status === 'PAID') totalIncome += cfg.amount;
    if (cfg.type === 'EXPENSE' && cfg.status === 'PAID') totalExpense += cfg.amount;
    createdCount++;
  }

  // Vendas variadas distribuídas nos últimos 90 dias
  const NUM_RANDOM = 80;
  for (let i = 0; i < NUM_RANDOM; i++) {
    // Distribuição: 40% último mês, 35% mês anterior, 25% três meses atrás
    const r = Math.random();
    const daysAgo = r < 0.4
      ? Math.floor(Math.random() * 30)
      : r < 0.75
        ? Math.floor(Math.random() * 30) + 30
        : Math.floor(Math.random() * 30) + 60;

    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // 60% receita, 40% despesa (variável, fora as fixas)
    const isIncome = Math.random() < 0.6;
    const cat = pick(isIncome ? incomeCats : expenseCats);
    const descriptions = isIncome
      ? INCOME_DESCRIPTIONS[cat.name] ?? [`${cat.name}`]
      : EXPENSE_DESCRIPTIONS[cat.name] ?? [`${cat.name}`];

    let amount: number;
    if (isIncome) {
      // vendas variadas
      amount = cat.name === 'Serviços' ? rand(350, 1800) : rand(45, 480);
    } else {
      // despesas variáveis
      if (cat.name === 'Marketing') amount = rand(80, 450);
      else if (cat.name === 'Fornecedores') amount = rand(450, 2200);
      else if (cat.name === 'Logística') amount = rand(15, 95);
      else amount = rand(40, 320);
    }

    // Segmento relacionado às vendas online
    let segment: typeof segments[0] | undefined;
    if (isIncome && cat.name === 'Vendas Online') {
      segment = pick(segments.filter((s) => s.name !== 'Loja Física'));
    } else if (isIncome && cat.name === 'Vendas Loja') {
      segment = segByName('Loja Física');
    } else if (Math.random() < 0.3) {
      segment = pick(segments);
    }

    const status: 'PAID' | 'PENDING' = Math.random() < 0.92 ? 'PAID' : 'PENDING';
    const dueDate = new Date(date);
    dueDate.setDate(date.getDate() + 3);

    const account = pick(accounts);
    const client = isIncome && Math.random() < 0.45 ? pick(clients) : undefined;
    const supplier = !isIncome && Math.random() < 0.35 ? pick(suppliers) : undefined;

    const tx = await prisma.transaction.create({
      data: {
        companyId: company.id,
        userId: user.id,
        type: isIncome ? 'INCOME' : 'EXPENSE',
        amount,
        description: pick(descriptions),
        date,
        dueDate,
        paymentDate: status === 'PAID' ? date : undefined,
        status,
        categoryId: cat.id,
        segmentId: segment?.id,
        clientId: client?.id,
        supplierId: supplier?.id,
        tags: [],
        source: Math.random() < 0.15 ? 'WHATSAPP' : 'MANUAL',
      },
    });

    if (status === 'PAID') {
      await prisma.accountTransaction.create({
        data: { transactionId: tx.id, accountId: account.id },
      });
      if (isIncome) totalIncome += amount;
      else totalExpense += amount;
    }
    createdCount++;
  }

  // === 9. Orçamentos ===
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const budgetItems = [
    { categoryName: 'Marketing', amount: 1500 },
    { categoryName: 'Fornecedores', amount: 4000 },
    { categoryName: 'Logística', amount: 600 },
  ];
  for (const b of budgetItems) {
    const cat = catByName(b.categoryName);
    if (!cat) continue;
    await prisma.budget.create({
      data: {
        companyId: company.id,
        categoryId: cat.id,
        amount: b.amount,
        period: 'MONTHLY',
        startDate: monthStart,
        endDate: monthEnd,
        alertThreshold: 80,
      },
    });
  }
  console.log(`✅ ${budgetItems.length} orçamentos`);

  console.log(`\n✅ ${createdCount} transações criadas`);
  console.log(`   💰 Receitas (PAID): R$ ${totalIncome.toFixed(2)}`);
  console.log(`   💸 Despesas (PAID): R$ ${totalExpense.toFixed(2)}`);
  console.log(`   📊 Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);

  // === 10. Cartões de Crédito + faturas ===
  const card1 = await prisma.creditCard.create({
    data: {
      companyId: company.id,
      name: 'Nubank Roxinho',
      brand: 'MASTERCARD',
      lastDigits: '4521',
      creditLimit: 8000,
      closingDay: 27,
      dueDay: 5,
      color: '#9333EA',
    },
  });
  const card2 = await prisma.creditCard.create({
    data: {
      companyId: company.id,
      name: 'Inter PJ',
      brand: 'MASTERCARD',
      lastDigits: '7820',
      creditLimit: 5000,
      closingDay: 20,
      dueDay: 28,
      color: '#F97316',
    },
  });

  // Cria fatura aberta do mês corrente em cada cartão com despesas variadas
  for (const card of [card1, card2]) {
    const refMonth = now.getMonth() + 1;
    const refYear = now.getFullYear();
    const closingDate = new Date(refYear, refMonth - 1, card.closingDay);
    const dueDate = new Date(refYear, refMonth - 1 + (card.dueDay < card.closingDay ? 1 : 0), card.dueDay);

    const invoice = await prisma.invoice.create({
      data: {
        companyId: company.id,
        creditCardId: card.id,
        referenceMonth: refMonth,
        referenceYear: refYear,
        closingDate,
        dueDate,
        status: 'OPEN',
        totalAmount: 0,
      },
    });

    const cardExpenses = card.id === card1.id
      ? [
          { d: 3, desc: 'Anúncio Meta Ads', amt: 280, cat: 'Marketing' },
          { d: 7, desc: 'Software Adobe Creative', amt: 89, cat: 'Software & Assinaturas' },
          { d: 10, desc: 'Material para evento', amt: 450, cat: 'Marketing' },
          { d: 14, desc: 'Restaurante reunião cliente', amt: 180, cat: 'Marketing' },
          { d: 18, desc: 'Uber para reunião', amt: 65, cat: 'Logística' },
        ]
      : [
          { d: 4, desc: 'Compras escritório', amt: 220, cat: 'Software & Assinaturas' },
          { d: 11, desc: 'Embalagens premium', amt: 380, cat: 'Logística' },
          { d: 16, desc: 'Brindes para clientes', amt: 540, cat: 'Marketing' },
        ];

    let invoiceTotal = 0;
    for (let i = 0; i < cardExpenses.length; i++) {
      const ex = cardExpenses[i]!;
      const txDate = new Date(refYear, refMonth - 1, ex.d);
      const cat = catByName(ex.cat);
      await prisma.transaction.create({
        data: {
          companyId: company.id,
          userId: user.id,
          type: 'EXPENSE',
          amount: ex.amt,
          description: ex.desc,
          date: txDate,
          dueDate,
          status: 'PENDING',
          categoryId: cat?.id,
          creditCardId: card.id,
          invoiceId: invoice.id,
          tags: [],
          source: 'MANUAL',
        },
      });
      invoiceTotal += ex.amt;
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { totalAmount: invoiceTotal },
    });
  }
  console.log(`✅ 2 cartões + faturas abertas`);

  // === 11. Metas ===
  const goalsData = [
    {
      name: 'Reserva de Emergência',
      description: 'Equivalente a 6 meses de despesas fixas',
      targetAmount: 25000,
      currentAmount: 14500,
      targetDate: new Date(now.getFullYear() + 1, 5, 30),
      color: '#10B981',
      icon: 'shield',
    },
    {
      name: 'Notebook novo',
      description: 'MacBook Pro M3 14"',
      targetAmount: 16000,
      currentAmount: 9800,
      targetDate: new Date(now.getFullYear(), now.getMonth() + 4, 15),
      color: '#3B82F6',
      icon: 'laptop',
    },
    {
      name: 'Viagem Fernando de Noronha',
      description: '7 dias em Maio do próximo ano',
      targetAmount: 12000,
      currentAmount: 4200,
      targetDate: new Date(now.getFullYear() + 1, 4, 15),
      color: '#F59E0B',
      icon: 'plane',
    },
  ];
  for (const g of goalsData) {
    const goal = await prisma.goal.create({
      data: { companyId: company.id, ...g },
    });
    // 2-3 contribuições históricas por meta
    const contribCount = 2 + Math.floor(Math.random() * 2);
    let acc = 0;
    for (let i = 0; i < contribCount; i++) {
      const portion = i === contribCount - 1 ? Number(g.currentAmount) - acc : Math.round((Number(g.currentAmount) / contribCount) * 100) / 100;
      acc += portion;
      const date = new Date(now);
      date.setMonth(date.getMonth() - (contribCount - i));
      await prisma.goalContribution.create({
        data: { goalId: goal.id, amount: portion, date, notes: `Aporte ${i + 1}` },
      });
    }
  }
  console.log(`✅ ${goalsData.length} metas`);

  console.log(`\n🎉 Seed DEMO concluído!`);
  console.log(`   Email: ${DEMO_EMAIL}`);
  console.log(`   Senha: ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed-demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
