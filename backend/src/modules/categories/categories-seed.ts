import type { PrismaClient, CategoryType } from '@prisma/client';

interface SeedCategory {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  children?: Omit<SeedCategory, 'children'>[];
}

const DEFAULT_CATEGORIES: SeedCategory[] = [
  // ── DESPESAS ──
  {
    name: 'Insumos',
    type: 'EXPENSE',
    color: '#f97316',
    icon: 'briefcase',
    children: [
      { name: 'Bobina', type: 'EXPENSE', color: '#f97316', icon: 'briefcase' },
      { name: 'Tinta', type: 'EXPENSE', color: '#f97316', icon: 'briefcase' },
      { name: 'Laminação', type: 'EXPENSE', color: '#f97316', icon: 'briefcase' },
    ],
  },
  {
    name: 'Logística',
    type: 'EXPENSE',
    color: '#3b82f6',
    icon: 'truck',
    children: [
      { name: 'Frete', type: 'EXPENSE', color: '#3b82f6', icon: 'truck' },
      { name: 'Combustível', type: 'EXPENSE', color: '#3b82f6', icon: 'car' },
      { name: 'Embalagem', type: 'EXPENSE', color: '#3b82f6', icon: 'truck' },
    ],
  },
  {
    name: 'Despesas Fixas',
    type: 'EXPENSE',
    color: '#8b5cf6',
    icon: 'home',
    children: [
      { name: 'Internet', type: 'EXPENSE', color: '#8b5cf6', icon: 'zap' },
      { name: 'Luz', type: 'EXPENSE', color: '#8b5cf6', icon: 'zap' },
      { name: 'Água', type: 'EXPENSE', color: '#8b5cf6', icon: 'home' },
      { name: 'Aluguel', type: 'EXPENSE', color: '#8b5cf6', icon: 'home' },
    ],
  },
  {
    name: 'Equipe',
    type: 'EXPENSE',
    color: '#ec4899',
    icon: 'heart',
    children: [
      { name: 'Funcionário', type: 'EXPENSE', color: '#ec4899', icon: 'heart' },
      { name: 'Aplicador', type: 'EXPENSE', color: '#ec4899', icon: 'heart' },
    ],
  },
  {
    name: 'Marketing',
    type: 'EXPENSE',
    color: '#eab308',
    icon: 'megaphone',
    children: [
      { name: 'Anúncio', type: 'EXPENSE', color: '#eab308', icon: 'megaphone' },
    ],
  },
  {
    name: 'Tributos',
    type: 'EXPENSE',
    color: '#ef4444',
    icon: 'book',
    children: [
      { name: 'Simples Nacional', type: 'EXPENSE', color: '#ef4444', icon: 'book' },
      { name: 'ISS', type: 'EXPENSE', color: '#ef4444', icon: 'book' },
    ],
  },
  {
    name: 'Financeiro',
    type: 'EXPENSE',
    color: '#6b7280',
    icon: 'trending-up',
    children: [
      { name: 'Taxas', type: 'EXPENSE', color: '#6b7280', icon: 'trending-up' },
    ],
  },
  {
    name: 'Manutenção',
    type: 'EXPENSE',
    color: '#78716c',
    icon: 'briefcase',
    children: [
      { name: 'Manutenção Geral', type: 'EXPENSE', color: '#78716c', icon: 'briefcase' },
    ],
  },
  {
    name: 'Outros (Despesa)',
    type: 'EXPENSE',
    color: '#a1a1aa',
    icon: 'briefcase',
  },
  // ── RECEITAS ──
  {
    name: 'Cliente Final',
    type: 'INCOME',
    color: '#22c55e',
    icon: 'trending-up',
  },
  {
    name: 'Shopee',
    type: 'INCOME',
    color: '#f97316',
    icon: 'trending-up',
  },
  {
    name: 'Mercado Livre',
    type: 'INCOME',
    color: '#eab308',
    icon: 'trending-up',
  },
  {
    name: 'Revenda',
    type: 'INCOME',
    color: '#3b82f6',
    icon: 'trending-up',
  },
  {
    name: 'Aplicação',
    type: 'INCOME',
    color: '#8b5cf6',
    icon: 'trending-up',
  },
  {
    name: 'Outros (Receita)',
    type: 'INCOME',
    color: '#a1a1aa',
    icon: 'trending-up',
  },
];

/**
 * Cria as categorias padrão para uma empresa.
 * IDEMPOTENTE: pula categorias que já existem (por nome + companyId).
 * Seguro pra chamar tanto no signup quanto pra clientes existentes.
 */
export async function seedDefaultCategories(
  prisma: PrismaClient,
  companyId: string,
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const cat of DEFAULT_CATEGORIES) {
    // Verifica se já existe
    const existing = await prisma.category.findFirst({
      where: { companyId, name: cat.name, parentCategoryId: null },
    });

    let parentId: string;

    if (existing) {
      parentId = existing.id;
      skipped++;
    } else {
      const parent = await prisma.category.create({
        data: {
          companyId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
        },
      });
      parentId = parent.id;
      created++;
    }

    if (cat.children) {
      for (const child of cat.children) {
        const existingChild = await prisma.category.findFirst({
          where: { companyId, name: child.name, parentCategoryId: parentId },
        });
        if (existingChild) {
          skipped++;
          continue;
        }
        await prisma.category.create({
          data: {
            companyId,
            name: child.name,
            type: child.type,
            color: child.color,
            icon: child.icon,
            parentCategoryId: parentId,
          },
        });
        created++;
      }
    }
  }

  return { created, skipped };
}
